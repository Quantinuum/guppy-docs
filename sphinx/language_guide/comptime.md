---
file_format: mystnb
kernelspec:
  name: python3
---

# Comptime

## Introduction

When writing Guppy code, it's important to understand when different parts of our program are executed. We distinguish between two key stages:

- **Compile-time** refers to everything that happens on our local machine before submitting the program to an emulator or quantum device.
  This includes the work the Guppy compiler does when calling ``guppy.compile_function()``, but also any other Python code that is run along-side.

- **Run-time** refers to anything happening on the quantum device or emulator in real-time, i.e. within qubit coherence times.

The general rule is that any code annotated with ``@guppy`` will be executed at *run-time*.
For example, consider the following program:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.angles import pi
from guppylang.std.quantum import qubit, rz, discard

@guppy
def divide_by_zero(q: qubit) -> None:
    rz(q, pi / 0)  # Divide by zero!

divide_by_zero.compile_function();  # Compilation succeeds
```

Compilation succeeds since the division by zero is not executed at compile-time.
Instead, we would get the error at *run-time* when the function is called.
Similarly, all control-flow instructions are executed at run-time.
For example, consider the following program:

```{code-cell} ipython3
from guppylang.std.builtins import array
from guppylang.std.quantum import cx

n = guppy.nat_var("n")

@guppy
def ladder(qs: array[qubit, n]) -> None:
    for i in range(n - 1):
        cx(qs[i], qs[i + 1])
```

The ``for`` loop will only be executed at run-time.
This means that no matter if ``n`` is 10 or 10,000,000, the program above will have the same size and compile-time, only the run-time differs.

This approach makes quantum programs more scalable and also enables features like branching on mid-circuit measurement outcomes which are not known at compile time.
However, it also comes at a cost:
since Python is a relatively slow language, we can only support a subset of its features inside ``@guppy`` functions to ensure that they are fast enough to be executed in real-time.

In this chapter, we introduce a language feature that gives us more control over this trade off.
Concretely, we show how to specify that certain parts of our program should be *executed at compile-time*.
Inside those sections, we'll be able to use all the features that Python offers, as opposed to only the Guppy subset.



## Comptime expressions

Code that should be executed at compile-time rather than run-time is marked with the ``comptime`` keyword.
The simplest variant of this feature is the ``comptime(...)`` expression that marks a single expression to be executed at compile-time.

For example, we can wrap the division by zero from the previous section into a ``comptime`` expression:

```{code-cell} ipython3
---
tags: [raises-exception]
---
import math
from guppylang.std.builtins import comptime
from guppylang.std.angles import angle

@guppy
def divide_by_zero(q: qubit) -> None:
    a = comptime(math.pi / 0)  # Divide by zero at compile-time!
    rz(q, angle(a))
```

As expected, the exception will now be triggered at compile-time instead of run-time:

```{code-cell} ipython3
---
tags: [raises-exception]
---
divide_by_zero.compile_function();  # Division by zero is triggered here
```

### Use case: parameterising programs

Guppy's ``comptime`` code is executed by the Python interpreter.
That's why we were able to use Python's ``math`` library in the example above.
Furthermore, ``comptime`` expressions have access to all outer Python variables in scope.
This allows us to precompute values in Python using arbitrary libraries that wouldn't be available in Guppy, and then use this data inside a Guppy function.

For example, we could use the [``networkx``](https://networkx.org/) library to generate a random graph and then construct the corresponding graph state in Guppy:

```{code-cell} ipython3
import networkx as nx
from guppylang.std.quantum import cz

g = nx.erdos_renyi_graph(n=20, p=0.2)

@guppy
def apply_edges(qs: array[qubit, 20]) -> None:
    for i, j in comptime(list(g.edges)):
        cz(qs[i], qs[j])

apply_edges.compile_function();
```

Note that ``comptime`` expressions must evaluate to types that are compatible with Guppy, for example numbers, tuples, or lists thereof.
In particular, Python lists are interpreted as immutable Guppy arrays (see [below](#arrays-and-lists) for details).
Other Python data structures or classes are not supported as Guppy doesn't understand them.
That's why we had to write ``list(g.edges)`` instead of just ``g.edges`` above:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def apply_edges(qs: array[qubit, 20]) -> None:
    for i, j in comptime(g.edges):
        cz(qs[i], qs[j])

apply_edges.compile_function();  # Compilation fails
```

### Use case: type-level comptime expressions

Guppy allows us to define functions that are [generic](static.md#generics) over the size of arrays, for example taking an ``array[qubit, n]`` where ``n`` is a type-level variable.
However, the kinds of operations available on those type-level numbers is limited.
For example, it's not possible to write ``array[qubit, n+1]`` for an array of length ``n + 1``.
Comptime expressions can be a nice workaround in those situations since they are also valid on type-level:

```{code-cell} ipython3
from guppylang.std.quantum import h

N = 20  # Define array length as Python variable

@guppy
def plus_state() -> array[qubit, comptime(N + 1)]:
    qs = array(qubit() for _ in range(comptime(N + 1)))
    for i in range(comptime(N + 1)):
        h(qs[i])
    return qs

plus_state.compile_function();
```


## Comptime functions

Besides single expressions, we can also mark whole functions as ``comptime`` using the ``@guppy.comptime`` decorator.
Similar to ``comptime`` expressions, code in those functions will be executed at compile-time and can use arbitrary Python features, not only the Guppy subset:

```{code-cell} ipython3
@guppy.comptime
def ladder(qs: array[qubit, 10]) -> None:
    for q1, q2 in zip(qs[1:], qs[:-1]):
        print("Applying CX")
        cx(q1, q2)
```

In a regular Guppy function, this code would be rejected since slicing is not supported and we would also get a borrow error because ``qs`` is used twice.
However, those restrictions no longer apply inside ``comptime`` functions.

Let's see what happens when we compile the `ladder` function.
```{code-cell} ipython3
ladder.compile_function();
```
As we can see, the ``print`` statement is executed at compile-time.
We get 9 printed lines, highlighting that the ``for`` loop is compile-time evaluated as well.

### What can and cannot happen at comptime

Note that not *everything* inside ``comptime`` functions can happen at compile-time.
For example, since we don't have access to a quantum computer at compile-time, we cannot actually apply the CX gates from the previous example.
Instead, we just record that CXs should happen between the specified qubits and then run those instructions when the program is actually executed.

This approach of "remembering" which gates should be applied at run-time is very similar to a traditional circuit.
However, this concept is more general in Guppy since it also applies to other classical computations that cannot be performed at compile-time:

```{code-cell} ipython3
@guppy.comptime
def foo(q: qubit, theta: angle) -> None:
    theta *= (1 + 1)
    rz(q, theta)
```

While ``1 + 1`` can be evaluated at compile-time, the ``theta *= ...`` part cannot.
This is because ``theta`` is a run-time function argument, so its value it not known at compile-time.
The actual doubling of the angle must be delayed until run-time.

```{note}
This approach of remembering which operations to apply at runtime is usually referred to as building a *computational graph*.
The technique is also commonly used in deep learning libraries like [TensorFlow](https://www.tensorflow.org/guide/intro_to_graphs), [PyTorch](https://pytorch.org/blog/computational-graphs-constructed-in-pytorch/), or [Jax](https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html).
```

To summarise, the following is *guaranteed* to be executed at compile-time:

- Calls to Python functions (e.g. ``print``, Python library functions, or user-defined Python functions)
- Control-flow (``if``, ``for``, ``while``, ``try``, ``with``, comprehensions)
- Arithmetic and other implicit calls to Python [special methods](https://docs.python.org/3/reference/datamodel.html#special-method-names) as long as all arguments are known at compile-time
- Assignments

The following will *never* be executed at compile-time:

- Calls to other Guppy functions (e.g. quantum gates, measurements, other Guppy library functions, or user-defined Guppy functions)
- Arithmetic and other implicit calls to Python [special methods](https://docs.python.org/3/reference/datamodel.html#special-method-names) if an argument is not known at compile-time

There are cases where it's not possible to execute control-flow at compile-time, for example if the value of a branch condition is not known ahead of time.
In those cases, we get a compile-time error:

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.quantum import measure

@guppy.comptime
def dynamic_branch() -> int:
    q = qubit()
    h(q)
    if measure(q):  # Branch on measurement outcome
        return 0
    else:
        return 1

dynamic_branch.compile_function();  # Compilation fails
```

Naturally, we don't know measurement outcomes at compile-time, so we cannot branch on them inside ``comptime`` functions.
The same also applies for other values that are not known at compile-time, such as function arguments:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy.comptime
def dynamic_branch(x: int) -> int:
    if x > 10:
        return 0
    else:
        return 1

dynamic_branch.compile_function();  # Compilation fails
```

This kind of dynamic branching is only possible in regular Guppy functions, not in a ``comptime`` context.

### Generalizing comptime functions

Note that Guppy comptime functions cannot yet be used in conjunction with [generic type variables](static.md#generics). Consider the following generic version of the `ladder` comptime function above.


```{code-cell} ipython3
---
tags: [raises-exception]
---

N_QB = guppy.nat_var("n_qb")

@guppy.comptime
def generic_ladder(qs: array[qubit, N_QB]) -> None:
    for q1, q2 in zip(qs[1:], qs[:-1]):
        print("Applying CX")
        cx(q1, q2)
    return ladder

generic_ladder.compile_function();  # Compilation fails
```

There is however a workaround for this particular issue. If we want to generalize this comptime `ladder` function with a variable number of qubits we can do this we can do this with metaprogramming. We can define a Python function which takes an integer argument and returns a instance of the comptime function for that integer.

```{code-cell} ipython3
from guppylang.defs import GuppyFunctionDefinition

def get_comptime_ladder_function(n_qubits: int) -> GuppyFunctionDefinition:
    @guppy.comptime
    def ladder(qs: array[qubit, comptime(n_qubits)]) -> None:
        for q1, q2 in zip(qs[1:], qs[:-1]):
            print("Applying CX")
            cx(q1, q2)
    return ladder

four_qubit_ladder = get_comptime_ladder_function(n_qubits=4)
four_qubit_ladder.compile_function();
```

Note how the input to the `ladder` function is of type `array[qubit, comptime(n_qubits)]` so we can create this function for any integer number of qubits.


### Arrays and lists

Arrays and regular Python lists can be used interchangeably inside ``comptime`` functions since the size of ``comptime`` lists is statically known.
In other words, when calling a function that accepts an array, it's also fine to pass a list with matching size:

```{code-cell} ipython3
from guppylang.std.quantum import measure_array

@guppy.comptime
def foo() -> array[bool, 10]:
    qs = [qubit() for _ in range(10)]
    return measure_array(qs)

foo.compile_function();
```

In fact, in the ``comptime`` context, arrays are identical to Python lists:

```{code-cell} ipython3
@guppy.comptime
def bar(qs: array[qubit, 10]) -> None:
    assert isinstance(qs, list)
    xs = array(1, 2, 3)
    assert isinstance(xs, list)

bar.compile_function();
```

The only restriction is that all elements should have the same type:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy.comptime
def array_mismatch(x: int) -> int:
    qs = array(qubit(), qubit(), 42)  # Try to create heterogeneous arrays
    measure_array(qs)

array_mismatch.compile_function();  # Compilation fails
```

Note that if we load a Python list inside a `comptime` expression, we get a [frozenarray](../api/generated/guppylang.std.array.frozenarray.rst) which is immutable.

As an illustration, let's define a guppy function which will build an ansatz circuit given some parameters. We will pass the parameters as a Python list which will be converted to a `frozenarray` by a `comptime` expression.


```{code-cell} ipython3
from guppylang.std.angles import pi
from guppylang.std.quantum import ry
from guppylang.std.array import frozenarray


def build_ansatz_func(n_qubits: int, n_layers: int) -> GuppyFunctionDefinition:
    @guppy
    def ansatz(
        params: frozenarray[float, comptime(n_layers)],
    ) -> array[qubit, comptime(n_qubits)]:
        qs = array(qubit() for _ in range(comptime(n_qubits)))

        # Add a layer of parameterized Ry gates
        for layer in range(comptime(n_layers)):
            for i in range(len(qs)):
                ry(qs[i], params[layer] * pi)

        # Add a layer of CX gates after the Ry gates
        for j in range(len(qs) - 1):
            cx(qs[j], qs[j + 1])

        return qs

    return ansatz

guppy_func = build_ansatz_func(n_qubits=4, n_layers=3)
guppy_func.check()
```

Now that we have constructed an ansatz function for four qubit and three layers we can evaluate it for some parameters.

If we specify our parameters as a Python list, we can load in our parameters with a comptime expression.

```{code-cell} ipython3
from guppylang.std.quantum import discard_array

params = [0.71, 0.94, 0.11]

@guppy
def main() -> None:
    farray = comptime(params) # comptime(params) is a frozenarray
    qubit_arr: array[qubit, 4] = guppy_func(farray)
    discard_array(qubit_arr)

main.check()
```

### Type checking and safety

The previous example nicely shows that the typing and safety guarantees provided by Guppy are still present in the ``comptime`` context.
In particular, when calling another Guppy function, we check that the arguments have correct types:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy.comptime
def bad(q: qubit) -> None:
    cx(q, 0)

bad.compile_function();  # Compilation fails
```

We also ensure that qubits are not used twice, even if they are aliased:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy.comptime
def bad(q: qubit) -> None:
    r = q     # Alias q as r
    cx(q, r)  # Apply CX on the same qubit

bad.compile_function();  # Compilation fails
```

Finally, allocated qubits may not be implicitly dropped:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy.comptime
def bad(q: qubit) -> None:
    tmp = qubit()
    h(tmp)
    cx(tmp, q)

bad.compile_function();  # Compilation fails
```


### Use case: metaprogramming

[Metaprogramming](https://en.wikipedia.org/wiki/Metaprogramming) is the process of writing programs that generate or manipulate other programs.
Guppy's ``comptime`` feature can be seen as a variant of metaprogramming where Python is used to generate Guppy code at compile-time.

For example, let's define a Python list describing a sequence of gates:

```{code-cell} ipython3
gates = ["H", "X", "S", "H"]
```

Using ``comptime``, we can now *generate* a Guppy function that applies those gates:

```{code-cell} ipython3
from guppylang.std.quantum import s, x

@guppy.comptime
def apply_gates(q: qubit) -> None:
    for gate in gates:
        match gate:
            case "H":
                h(q)
            case "X":
                x(q)
            case "S":
                s(q)

apply_gates.compile_function();
```

After compilation, the resulting program will be exactly the same as if we had just written

```{code-cell} ipython3
@guppy.comptime
def apply_gates(q: qubit) -> None:
    h(q)
    x(q)
    s(q)
    h(q)
```

This is because the ``for`` loop and ``match`` statements are all executed at compile-time, so only the gate sequence remains.

