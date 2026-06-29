---
file_format: mystnb
kernelspec:
  name: python3
---

# Ownership and Linear Types

## Introduction

Quantum mechanics is a linear theory meaning that individual units of quantum information (qubits) cannot be cloned or deleted.

Guppy enforces this linearity constraint at compile time, preventing the construction of certain invalid programs. By statically enforcing linearity, mistakes can be detected at compile time rather than when the program is executed on a quantum device or simulator.

Quantum programs are composed of logic gates which correspond to linear reversible operations. In contrast, quantum measurement is an irreversible, usually destructive process. If a qubit is destructively measured, it should be reinitialized before we try to use it again.

Guppy ensures that quantum resources are managed correctly through its ownership model.

In other programming languages like Rust [^cite_rust_book_ownership], ownership is understood to be a set of rules which govern how a program manages memory. In Rust, memory safety is guaranteed at compile time. Every value in Rust is assigned to one and only one variable ( "owner") and when the owner goes out of scope the value is immediately dropped.

This avoids pitfalls of manually allocating and deallocating memory which are a frequent cause of bugs in other programming languages. Guppy ownership is inspired by Rust but has some key differences.

Just like Rust, Guppy has ownership rules which are enforced by the compiler. These enforce that the program obeys the constraints imposed by linearity. The ownership rules allow Guppy to provide the following safety guarantees.

**Guppy safety guarantees**

1. Qubits cannot be used after they are destructively measured or discarded.
2. A multi-qubit gate cannot use the same qubit more than once.
3. It is impossible to implicitly discard or leak qubits.


 In Guppy destructive operations such as measurement and discarding are considered to "consume" the qubit whereas unitary gates "borrow" a qubit and modify its state without destroying it. 

By making use of ownership, Guppy allows the user to safely manage ancilla qubits which may be allocated, used and then discarded during the runtime of the quantum program.


## Linear types

By treating qubits as if they have _values_, Guppy achieves a simple and
intuitive syntax where qubits can, for example, be passed in and out of
functions, just like classical types. But there are important limitations on
what we can do with them: we cannot copy a qubit (this is essentially the
content of the _no-cloning theorem_ in quantum mechanics); nor can we just
forget about it. These are precisely the defining properties of a _linear type_.

The value of a linear type must be used exactly once. Linear types usually
represent _resources_ of some kind (e.g. a file, a communication channel, a
database, a block of memory, an entropy source), and the qubit type is no
exception.

The advantage of a language having a concept of linear types is that the
compiler can enforce correct usage. It is then impossible to write programs that
try to use a linear "value" more than once, or to leak it. An example of the
former would be passing the same linear variable as two different arguments to a
function call, e.g. `cx(q, q)`.

Note that any container type (such as a struct or array) that includes a linear
type is automatically linear itself.

A related concept is that of _affine_ types, which satisfy a slightly weaker
restriction: their values may not be used more than once. The difference is that
they _can_ be implicitly discarded. Guppy arrays (of non-linear types) are
affine: they cannot be copied, but can be silently dropped.

## Introduction to ownership and scope

We can illustrate how ownership works with a simple example.

We first define a simple Guppy function `prepare_bell` which allocates two qubits within its scope, prepares an entangled Bell state $|\Phi^+\rangle$.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.quantum import qubit, h, cx

@guppy
def prepare_bell() -> tuple[qubit, qubit]:
    q0, q1 = qubit(), qubit() # Allocated qubits owned by this scope
    h(q0) 
    cx(q0, q1)
    return q0, q1 # Transfers ownership to the caller
```
The `h` and `cx` gates are unitary operations which borrow the qubits `q0` and `q1` and modify their state without consuming them. 

The qubits created by `prepare_bell` can then be used inside another function that calls it. 

```{code-cell} ipython3
from guppylang.std.quantum import measure

@guppy
def main() -> None:
  # Qubit ownership transferred to q0, q1 from inside prepare_bell
  q0, q1 = prepare_bell()
  # Measurement consumes the qubits
  measure(q0)
  measure(q1)

# If we check, we see that this works :)
main.check() 
```

Note how ownership of the qubits passes from inside the scope of `prepare_bell` to the scope of `main`. The `main` function owns the qubits and can make use of them. In this case we can consume the qubits `q1` and `q2` by destructively measuring them. 


## Borrowing

As mentioned above, unitary gates are considered to be borrowing operations.
 These contrast with consuming operations such as destructive measurement which require the qubit to be owned by the caller.

Let's take a closer look at the `prepare_bell` function from before.

```{code-cell} ipython3

@guppy
def prepare_bell() -> tuple[qubit, qubit]:
    q0, q1 = qubit(), qubit()
    
    # We own q0 and q1, so we can temporarily lend them to someone else
    h(q0) # borrow q0 value

    # Borrow of q0 by h expired, so we're free to borrow q0 again:
    cx(q0, q1) # borrow q0, borrow q1

    # Borrows of q0 and q1 by cx expired, so we're free to return them:
    return q0, q1
```

The Hadamard gate borrows the qubit `q0` and modifies its state before returning it to the scope of the function. This ensures that the CX gate can safely make use of the value `q0`.

Importantly, the Guppy compiler requires that each qubit can only be borrowed once at a time.
This forbids linearity violations like the following where a CX gate is applied to the same qubit twice (`cx(q0, q0)`)

```{code-cell} ipython3
---
tags: [raises-exception]
---

@guppy
def prepare_bell_incorrect() -> tuple[qubit, qubit]:
    q0, q1 = qubit(), qubit()
    h(q0) 
    cx(q0, q0) # q0 borrowed twice at once
    return q0, q1 

prepare_bell_incorrect.check() # Check fails :(
```

In Guppy, it is also not possible to return a borrowed value. The `prepare_bell` function above works as the qubits are allocated within the function body. If we instead passed in the qubits `q0` and `q1` as function arguments we would get a compiler error.

Guppy functions are assumed to borrow qubits by default. This means that non-consuming operations (including all unitary gates) can be applied to input qubits freely. However if we wish to measure an input qubit within a function, we must explicitly take ownership of that qubit.

If we attempt to measure qubits which are not owned we get a compiler error. 

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.quantum import discard, Measurement

@guppy
def measure_x_basis(q0: qubit) -> Measurement:
    h(q0)
    return measure(q0)

@guppy
def main() -> None:
    q0, q1 = prepare_bell()
    measure_x_basis(q0) # Error: borrowed qubits may not be measured
    discard(q1)

main.check() # Check fails :(
```

As the error message indicates, this can be fixed if the user explicitly takes declares ownership of the qubit with the `@owned` annotation.

```{code-cell} ipython3
from guppylang.std.builtins import owned
from guppylang.std.quantum import Measurement

@guppy
def measure_x_basis(q0: qubit @owned) -> Measurement:
    h(q0)
    return measure(q0)

@guppy
def main() -> None:
    q0, q1 = prepare_bell()
    measure_x_basis(q0)
    discard(q1)

main.check() # Check succeeds :)
```

If we try to apply a gate to the qubit `q` after the destructive measurement we get a compiler error as `q` has been deallocated by the measurement.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def borrow_consumed() -> None:
    q = qubit() 
    h(q)
    measure(q)
    h(q) # Applying a gate to a consumed qubit doesn't work

borrow_consumed.check() # Check fails :(
```

## No implicit discarding of qubits

We have just seen how Guppy does not allow consumed qubits to be used. Conversely, there is also a safety concern if qubits are not deallocated after they are used. Unmeasured temporary qubits often indicate an implementation bug. Further, if these qubits are discarded this frees up qubits which can potentially be used later in the computation.

Guppy ensures that qubits are properly deallocated after they are no longer in use. 
To enable this safety guarantee, guppy functions must either consume a qubit they own (by a destructive measurement or discard) or return it to the calling scope.

Here the function below allocates a qubit and applies a Hadamard gate without returning the qubit. The Hadamard merely borrows the qubit without consuming it. This is considered a leakage error as there would be no remaining reference to the qubit `q` once `main` returns.


```{code-cell} ipython3
---
tags: [raises-exception]
---

@guppy
def implicit_discard() -> None:
    q = qubit() # Allocated qubit is not consumed
    h(q)

implicit_discard.check() # Check fails :(
```

To fix the implicit discard, we could just modify the function to return the qubit `q` to the outer scope.

```{code-cell} ipython3
@guppy
def prepare_plus() -> qubit:
    q1 = qubit()
    h(q1)
    return q1 # return ownership of q to the caller

prepare_plus.check() # Check succeeds :)
```

Alternatively we could consume the qubit by measuring it.

```{code-cell} ipython3
@guppy
def prepare_and_measure() -> None:
    q = qubit() 
    h(q)
    measure(q) # consume the qubit q

prepare_and_measure.check() # Check succeeds :) 
```

Let's see an example with discarding. Its often the case that we are only interested in measuring a subset of the qubits in our program. Here we implement a simplified Hadamard test program which can be used to calculate the expectation value of the $Y$ operator based on the measurement of an ancilla qubit `a`.

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.quantum import cy
from guppylang.std.builtins import output

@guppy
def main() -> None:
    a, q = qubit(), qubit() # Allocate two qubits
    h(a)
    cy(a, q)

    # Measure ancilla in X-basis
    h(a)
    c0 = measure(a).read()
    output("c[0]", c0) # Get the result of measuring the ancilla

main.check() # Check fails :(
```

As with the previous error, the problem here is that the qubit `q` is neither consumed or returned by the `main` function. We can fix this easily by adding in an explicit `discard` operation for the idling qubit.  

```{code-cell} ipython3
from guppylang.std.quantum import cy, discard

@guppy
def main() -> None:
    # Allocate two qubits
    a, q = qubit(), qubit()
    h(a)
    cy(a, q)

    # Measure ancilla in X-basis
    h(a)
    c0 = measure(a).read()
    result("c[0]", c0) # Get the result of measuring the ancilla

    # Discard idling qubit
    discard(q)

main.check() # Check succeeds :) 
```

## Summary of ownership rules

In summary, Guppy enforces the following ownership rules at compile time.

1. Moving or consuming a value requires ownership
2. Owned values must be moved or consumed
3. Owned values can no longer be used after they are moved or consumed
4. Only one borrow can be active at the same time



[^cite_rust_book_ownership]: Steve Klabnik and Carol Nichols, with contributions from the Rust Community. The Rust Programming Language, [Chapter 4: Understanding ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html).
