---
file_format: mystnb
kernelspec:
  name: python3
---

# Migrating to Guppy from pytket

This guide will cover how to migrate quantum programs from [pytket](https://docs.quantinuum.com/tket/) to Guppy. 

Guppy is a new programming language developed by Quantinuum for the next generation of quantum programs. Its design allows for quantum programs with complex control flow (loops and recursion and more) to be expressed in intuitive Pythonic syntax.

In pytket, a user can build a quantum circuit by appending quantum and classical operations to form a list of gate commands. The user writes a python program which when run builds a pytket [Circuit](inv:pytket#circuit_class) instance. Internally, this circuit is stored as a Directed Acyclic Graph (DAG) which serves as the intermediate representation for the TKET compiler. The TKET compiler will continue to be maintained and will play an important role in the optimization of quantum programs written in Guppy.

Guppy is a compiled language which distinguishes it from Python. The user writes a quantum program with Guppy functions and then compiles this program [^1]. The Guppy compiler ensures safety guarantees for quantum programs through its type system. To read more about this type safety, see the language guide section on [ownership rules](language_guide/ownership.md). Once we have a compiled program, we can run it on an emulator or quantum device. 


## Loading pytket circuit as Guppy functions


[load_pytket_docs]: https://docs.quantinuum.com/guppy/api/decorator.html#guppylang.decorator.guppy.load_pytket

A pytket [Circuit](inv:pytket#circuit_class) instance can be invoked as a Guppy function using the [guppy.load_pytket][load_pytket_docs] method. This feature can be useful for making use of existing pytket circuits directly in Guppy without having to rewrite code from scratch. In the near term, it is also useful to synthesize circuits (e.g. state preparation, permutations) using pytket's higher level "box" constructs. These synthesized circuits can the be invoked as Guppy functions.

### Basic Example

Let's start with a simple example where we can build a pytket circuit and load it as a Guppy function.

```{code-cell} ipython3
from pytket import Circuit

qft2_circ = Circuit(2)
qft2_circ.H(0)
qft2_circ.CRz(0.5, 1, 0)
qft2_circ.H(1)
qft2_circ.SWAP(0, 1)
```

We can now use this pytket circuit to build a Guppy function as follows. We first pass in a string label and then the circuit instance.

```{code-cell} ipython3
from guppylang import guppy

qft_func = guppy.load_pytket("qft_func", qft2_circ)
```

We now have a Guppy function called `qft_func` which we can compile or use as a subroutine in other functions.

By default [guppy.load_pytket][load_pytket_docs] will create Guppy functions which use arrays of qubits as inputs. This means that our `qft_func` above will take an array of two qubits as input. 
If we want the function to take two separate qubit arguments, we can specify `use_arrays=False` in [guppy.load_pytket][load_pytket_docs]. Also note that by default, circuits with separate quantum registers become Guppy functions that take multiple arrays of qubits as input. 

Using [guppy.load_pytket][load_pytket_docs] works best when the loaded pytket [Circuit](inv:pytket#circuit_class) contains only unitary quantum gates. This is because Guppy allows
 qubits to be explicitly allocated at runtime and deallocated by measurement. By contrast, pytket
  treats qubits as alive for the entirety of the quantum program. Functions defined with pytket circuits are also not type checked before compilation.
   It is therefore best practice to use [guppy.load_pytket][load_pytket_docs] for unitary subroutines,
    which map directly to Guppy functions which borrow qubits. Measurement and classical logic should ideally be done directly in Guppy. This has the benefit of allowing functions which consume qubits to be type checked according to Guppy's ownership model. 

### How to deal with operations unsupported by Guppy

Loading pytket circuits works by converting the pytket circuit to a HUGR function under
the hood. Guppy also compiles to HUGR meaning effectively we get a pre-compiled Guppy
function we can call.

Quantum operations in HUGR are defined in _extensions_. Most operations in the Guppy [std.quantum][quan-std] and
[std.qsystem][qsys-std] modules map directly to the HUGR extensions [tket.quantum][quan-ext] and
[tket.qsystem][qsys-ext]. When loading pytket circuits, pytket ``OpTypes`` that match to those
extension operations are loaded directly.
All of the operations supported by pytket can be found in the pytket [OpType](inv:pytket#optype) documentation.

Unsupported pytket operations are loaded as opaque, which allows a round-trip conversion
to be successful. However, such opaque operations cannot be emulated or submitted to devices.

In the code snippet below we will construct a circuit for performing a two-qubit unitary operation which we will specify as a numpy array. This unitary box is not natively supported.

[qsys-ext]: https://github.com/quantinuum/tket2/blob/b0103930a4b47ecc457e8a0e023e131955c553bd/tket-qsystem/src/extension/qsystem.rs

[quan-ext]: https://github.com/quantinuum/tket2/blob/b0103930a4b47ecc457e8a0e023e131955c553bd/tket/src/ops.rs

[qsys-std]: api/generated/guppylang.std.qsystem.rst
[quan-std]: api/generated/guppylang.std.quantum.rst

```{code-cell} ipython3
import numpy as np
from guppylang import guppy
from pytket.circuit import Circuit, Unitary2qBox, OpType

G = np.array(
    [
        [1, 0, 0, 0],
        [0, 1 / np.sqrt(2), -1 / np.sqrt(2), 0],
        [0, 1 / np.sqrt(2), 1 / np.sqrt(2), 0],
        [0, 0, 0, 1],
    ]
)
G_box = Unitary2qBox(G)

pytket_circ = Circuit(3)
pytket_circ.add_gate(G_box, [0, 1])
pytket_circ.CCX(0, 1, 2)
pytket_circ.add_gate(OpType.CnY, [0, 1, 2])

# Load pytket circuit as a Guppy function.
circuit_func = guppy.load_pytket("circuit_func", pytket_circ)
```

We now have a Guppy function that takes three qubits as input. As this function has inputs, it cannot be an entrypoint to an executable program. We therefore have to call `circuit_func` inside a Guppy function which takes no arguments and allocates some qubits for it to use.

```{code-cell} ipython3
from guppylang.std.quantum import discard_array

@guppy
def guppy_func() -> None:
  qs = array(qubit() for _ in range(3))
  circuit_func(qs)
  discard_array(qs)
```

We will get an error if we try to invoke the Selene emulator as it cannot execute the opaque op defining the {py:class}`~pytket.circuit.Unitary2qBox` in the call to `circuit_func`.

```{code-cell} ipython3
---
tags: [raises-exception]
---

sim_result = guppy_func.emulator(n_qubits=3).with_seed(2).run()
```

The solution to handling operations which are not directly supported is to decompose
these unsupported operations into gates from the supported extensions before loading the circuit. This can
be readily done with the {py:class}`~pytket.passes.AutoRebase` pass from pytket.

```{code-cell} ipython3
from pytket.passes import AutoRebase, DecomposeBoxes

rebase_pass = AutoRebase({OpType.H, OpType.Rz, OpType.CX}) # Specify a universal gate set  

DecomposeBoxes().apply(pytket_circ) # Decompose the Unitary2qBox to primitive gates

rebase_pass.apply(pytket_circ) # Convert all gates in pytket_circ to {H, Rz, CX}

# Load rebased circuit as a Guppy function
new_circuit_func = guppy.load_pytket("guppy_func", pytket_circ)
```

Now our compiled Guppy program should contain no opaque operations and is executable on the emulator when called inside `guppy_func`.

## Compilation and optimization of quantum programs

The pytket library contains many [compilation passes](https://docs.quantinuum.com/tket/api-docs/passes.html) for transforming quantum programs. Many of these passes are designed to optimize quantum circuits to reduce the number of entangling quantum gates. Using pytket, we can also convert programs to the native gateset of a quantum device and solve for qubit connectivity constraints.

As of August 2025, optimization of compiled Guppy programs is still at an early stage. When using `guppy.emulator()` the quantum program is converted to the [qsystem native instructions](api/generated/guppylang.std.qsystem.rst) with no further optimization. In the near term, it is planned to optimize regions of these programs with the kind of compiler passes that are already available in pytket using an updated version of the TKET compiler.  

If you want to optimize your quantum program using pytket, you can create a pytket circuit and optimize it. This optimized program can then be loaded as a Guppy function by using [guppy.load_pytket][load_pytket_docs].

## Execution of quantum programs

The Guppy language comes with a built in [emulator](api/emulator.md) module built on top of [Selene](https://github.com/quantinuum/selene) for the execution of quantum programs. This emulator can execute compiled Guppy programs which include control flow and constructs from the standard library. There are two simulation modes available namely stabilizer and statevector which are provided via the Stim and QuEST backends respectively. Selene also supports [statevector output](guppylang/examples/state_results.ipynb) for testing and debugging. 

For more information on the Selene emulator see the [Selene documentation](https://docs.quantinuum.com/selene).

## Footnotes 

[^1]: Guppy programs are compiled to [HUGR](https://github.com/quantinuum/hugr) which is a new intermediate representation of quantum programs.