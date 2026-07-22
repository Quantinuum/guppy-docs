---
file_format: mystnb
kernelspec:
  name: python3
---

# FAQs

## When do I use Python and when do I use Guppy?

Use Python if possible, in general it is more expressive than Guppy. Use Guppy for
quantum operations and for classical things when something depends on the results of a
measurement. The exception to this rule of thumb is when doing everything in Python
ahead of time would make your Guppy program really big. It is often more
compact to use guppy loops and functions to avoid repeating things in programs. 

The `comptime` functionality lets you mix Guppy and Python to make use of compile time
evaluation, see more in the [language guide section](language_guide/comptime.md)


## Can I use Guppy in conjunction with Qiskit or other quantum computing tools?

Yes, to a limited extent. As mentioned in the [pytket migration guide](migration_guide.md) it is possible to load pytket circuits as Guppy functions using [guppy.load_pytket](https://docs.quantinuum.com/guppy/api/decorator.html#guppylang.decorator.guppy.load_pytket). Therefore, if a program can be converted to pytket, it will generally be possible to use as a Guppy function as well.

Here is a basic example where we import a Bell state circuit from qiskit using the [qiskit_to_tk](https://docs.quantinuum.com/tket/extensions/pytket-qiskit/api.html#pytket.extensions.qiskit.qiskit_convert.qiskit_to_tk) converter. This conversion is from the [pytket-qiskit extension](https://docs.quantinuum.com/tket/extensions/pytket-qiskit/) which is a separate PyPi package.

```{code-cell} ipython3
from qiskit import QuantumCircuit
from pytket.extensions.qiskit.qiskit_convert import qiskit_to_tk

# Define a simple Bell state circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)

# Convert qiskit to pytket
pytket_circuit = qiskit_to_tk(qc)


# Register the pytket Circuit as a Guppy function.
bell_func = guppy.load_pytket("circ_func", pytket_circ)


# We can now use bell_func as a subroutine in a larger Guppy program
@guppy
def main() -> None:
    qs = array(qubit() for _ in range(2))
    bell_func(qs)
    result("c", measure_array(qs))

sim_result_bell_circuit = (
    main.emulator(n_qubits=2).with_seed(4242).with_shots(n_shots).run()
)

print(sim_result_bell_circuit.collated_counts())
```

## How do I use this pytket OpType or Box?

Guppy has a standard (small) quantum set defined in the guppy standard library
module [quantum](api/generated/guppylang.std.quantum.rst).
The quantinuum hardware primitive gates are also available in the [qsystem module](api/generated/guppylang.std.quantum.rst).

To use a pytket op or Box synthesis outside this set you can define a circuit, get
pytket to synthesise in to a universal gate set which is a subset of the gates known to
Guppy, then load it in. See more in the [pytket migration guide](migration_guide.md).


## How do angles work?
Some functions in Guppy take angles as arguments, for example an `rz`
function for rotating a qubit about Z. `angle` is a std library type imported
from [guppylang.std.angles](api/generated/guppylang.std.angles.rst). It can be constructed from a `float` corresponding to half
turns or by arithmetic on another angle like `pi`:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.angles import angle, pi
from guppylang.std.quantum import qubit, rz

@guppy
def rotate(q: qubit) -> None:
    # an integer multiple of `angle` is also an angle
    rz(q, 2*pi)
    # equivalent explicit construction from float in half-turns
    pi_2 = angle(2.0)
    rz(q, pi_2)
```

See more in the [language guide section on angles](language_guide/data_types/angles.md).

## Why am I getting "unsupported" errors?

This Guppy function doesn't currently have compilation to HUGR. Please find/raise an issue or find a different way of writing your program.

## Why am I getting "no lowering found" errors?

Though Guppy can compile your operation to HUGR, the lowering to LLVM executable code for the Selene simulator doesn't yet work. Please find a workaround or raise an issue on the [HUGR repository](https://github.com/quantinuum/hugr/).

## Why is my type checker raising errors with Guppy?

When using a Python type checker (such as [mypy](https://www.mypy-lang.org/)) with Guppy you may encounter errors that arise from a fundamental difference between Python and Guppy syntax.

For example, using `@ owned` annotations in function signatures, 

```{code-cell} ipython3
from guppylang.std.builtins import owned

@guppy
def foo(q: qubit @ owned) -> None: ...
```

is not valid Python syntax and `mypy` will raise the following error:

```
error: Invalid type comment or annotation  [valid-type]
```

As this is a fundamental difference between Python and Guppy, it is not possible to resolve these errors. Instead, these errors must be suppressed in order for the type checker to run without error. There are two methods to suppress errors raised by `mypy`, although this may differ if another checker is used.

To suppress individual errors, the `type: ignore[...]` comment can be used on the line that causes the error. In this example, we can suppress the `valid-type` error with:

```{code-cell} ipython3
@guppy
def foo(q: qubit @ owned) -> None: ...  # type: ignore[valid-type]
```

In the case where multiple errors are raised in the same function, it may be more convenient to suppress all errors using `@no_type_check`:

```{code-cell} ipython3
from typing import no_type_check

@guppy
@no_type_check
def foo(q: qubit @ owned) -> None: ...
```

Below are a few common examples in which Guppy will cause an error with `mypy` that will need to be suppressed.

### Generic Guppy variables

Using generic Guppy variables in function signatures can cause `mypy` to raise errors. For example, the following use of a generic type variable will raise the `valid-type` error:

```{code-cell} ipython3
T = guppy.type_var("T")

@guppy
def foo(x: T) -> T: ...
```

Using generic natural variables can cause `mypy` to raise `call-overload` errors when used as arguments to other functions within a generic function definition. For example, using `range` with a generic will raise a `call-overload` error:

```{code-cell} ipython3
from guppylang.std.builtins import array

N = guppy.nat_var("N")

@guppy
def foo(arr: array[qubit, N]) -> None:
    for _ in range(N): ...
```

### Guppy structs

Guppy structs can be a significant source of type check errors, especially when they are defined using generic variables. Consider the following example that defines a Guppy struct that has a generic size for the array:


```{code-cell} ipython3
from typing import Generic

@guppy.struct
class Foo(Generic[N]):
    arr: array[qubit, N]
```

This will raise two type check errors from `mypy`:
1. `Unsupported dynamic base class "Generic"  [misc]`
2. `Variable "N" is not valid as a type  [valid-type]`

Unfortunately, `@no_type_check` cannot be used to suppress errors in Guppy structs, so instead individual errors must be suppressed with `type: ignore`. In the example above, this would look like:

```{code-cell} ipython3
@guppy.struct
class Foo(Generic[N]):  # type: ignore[misc]
    arr: array[qubit, N]  # type: ignore[valid-type]
```
