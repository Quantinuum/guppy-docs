# `@guppy` decorator


```{eval-rst}
.. currentmodule:: guppylang.decorator

.. decorator:: guppy (*, unitary=False, control=False, dagger=False, power=False, max_qubits=None)

   Registers a function for Guppy compilation. This is the main decorator that applies to most use cases / functions
   written in Guppy. 
   
   :keyword unitary: Convenience argument that when set to `True`, sets `control=True`, `dagger=True`, and `power=True`.
   :type unitary: python:bool
   :keyword control: Marks a function as being controllable, similar to how a `NOT` gate is controllable to form a `CNOT`, etc.
   :type control: python:bool
   :keyword dagger: Marks a function as having an auto-inferable adjoint.
   :type dagger: python:bool
   :keyword power: Marks a function as having an auto-inferable power operation, that applies the function repeatedly.
   :type power: python:bool
   :keyword max_qubits: Hints the maximum number of qubits that this function uses. When used on the entrypoint function,
     allows to omit the `n_qubits` parameter when calling :func:`~guppylang.defs.GuppyFunctionDefinition.emulator`.
   :type max_qubits: python:int | None
   :rtype: GuppyFunctionDefinition

   .. code-block:: python

      from guppylang import guppy
      from guppylang.std.quantum import h, qubit

      @guppy
      def plus_q() -> qubit:
         """Allocate and prepare a qubit in the |+> state"""
         q = qubit()
         h(q)
         return q

.. decorator:: guppy.comptime

   Registers a function to be executed at compile-time during Guppy compilation, 
   enabling the use of arbitrary Python features as long as they don't depend on 
   runtime values.

   .. code-block:: python

      from guppylang import guppy
      from guppylang.std.builtins import array

      @guppy.comptime
      def print_arrays(arr1: array[str, 10], arr2: array[str, 10]) -> None:
         for s1, s2 in zip(arr1, arr2):
            print(f"({s1}, {s2})")


.. decorator:: guppy.struct

   Registers a class as a Guppy struct.

   .. code-block:: python

      from guppylang import guppy

      @guppy.struct
      class MyStruct:
         field1: int
         field2: int

         @guppy
         def add_fields(self: "MyStruct") -> int:
            return self.field2 + self.field2


.. decorator:: guppy.enum
   Registers a class as a Guppy enum.

        .. code-block:: python
         from guppylang import guppy

         @guppy.enum
         class MyEnum:
             Variant1 = {"a": int, "b": qubit}
             Variant2 = {"a": int}

             @guppy
             def method_on_enum(e: MyEnum) -> int:
                 return 42
     

.. method:: guppy.type_var(name, copyable=True, droppable=True)

   :param name: Name of the type variable.
   :type name: str
   :param copyable: Whether the type variable is copyable.
   :type copyable: bool
   :param droppable: Whether the type variable is droppable.
   :type droppable: bool
   :rtype: TypeVar

   Creates a new type variable.

   .. code-block:: python

      from guppylang import guppy

      T = guppy.type_var("T")

      @guppy
      def identity(x: T) -> T:
         return x


.. method:: guppy.nat_var(name)

   :param name: Name of the constant natural variable.
   :type name: str
   :rtype: TypeVar

   Creates a new nat variable.


.. method:: guppy.const_var(name, ty)

   :param name: Name of the constant type variable.
   :type name: str
   :param ty: Type expression string.
   :type ty: str
   :rtype: TypeVar

   Creates a new const type variable.


.. decorator:: guppy.declare

   Declares a Guppy function without defining it.


.. decorator:: guppy.overload(*funcs)

   :param funcs: Guppy function definitions to combine.
   :type funcs: list[~guppylang.definition.GuppyFunctionDefinition]

   Collects multiple function definitions into one overloaded function.

   Consider the following example:

   .. code-block:: python

      @guppy.declare
      def variant1(x: int, y: int) -> int: ...

      @guppy.declare
      def variant2(x: float) -> int: ...

      @guppy.overload(variant1, variant2)
      def combined(): ...


   Now, `combined` may be called with either one `float` or two `int` arguments,
   delegating to the implementation with the matching signature:

   .. code-block:: python

      combined(4.2)  # Calls `variant1`
      combined(42, 43)  # Calls `variant2`


   Note that the compiler will pick the *first* implementation with matching
   signature and ignore all following ones, even if they would also match. For
   example, if we added a third variant

   .. code-block:: python

      @guppy.declare
      def variant3(x: int) -> int: ...

      @guppy.overload(variant1, variant2, variant3)
      def combined_new(): ...

   then a call `combined_new(42)` will still select the `variant1` implementation
   `42` is a valid argument for `variant1` and `variant1` comes before `variant3`
   in the `@guppy.overload` annotation.


.. method:: guppy.constant(name, ty, value)

   :param name: Name of the constant.
   :type name: str
   :param ty: Type expression string.
   :type ty: str
   :param value: The value of the constant.
   :type value: ~hugr.val.Value

   Adds a constant backed by a `hugr.val.Value`


.. decorator:: guppy.pytket(input_circuit)

   :param input_circuit: The pytket circuit to load.
   :type input_circuit: ~pytket.circuit.Circuit

   Backs a function declaration by the given pytket circuit. The declaration signature 
   needs to match the circuit definition in terms of number of qubit inputs and 
   measurement outputs. 

   There is no linearity checking inside pytket circuit functions. Any measurements  
   inside the circuit get returned as bools, but the qubits do not get consumed and the  
   pytket circuit function does not require ownership. You should either make sure you  
   discard all qubits you know are measured during the circuit, or avoid measurements
   in the circuit and measure in Guppy afterwards.
   
   Note this decorator doesn't support passing inputs as arrays (use `load_pytket` 
   instead).

   .. code-block:: python

      from pytket import Circuit
      from guppylang import guppy

      circ = Circuit(1)
      circ.H(0)
      circ.measure_all()

      @guppy.pytket(circ)
      def guppy_circ(q: qubit) -> bool: ...

      @guppy
      def foo(q: qubit) -> bool:
         return guppy_circ(q)


.. method:: guppy.load_pytket(name, input_circuit, *, use_arrays=True)

   :param name: The name of the Guppy function.
   :type name: str
   :param input_circuit: The pytket circuit to load.
   :type input_circuit: ~pytket.circuit.Circuit
   :param use_arrays: Whether to use arrays for registers in the function definition.
   :type use_arrays: bool
   :rtype: ~guppylang.definition.GuppyFunctionDefinition

   Load a pytket :py:class:`~pytket.circuit.Circuit` as a Guppy function. By default, 
   each qubit register is represented by an array input (and each bit register as an 
   array output), with the order being determined lexicographically. The default 
   registers are 'q' and 'c' respectively. You can disable array usage and pass 
   individual qubits by passing `use_arrays=False`.

   .. code-block:: python

      from pytket import Circuit
      from guppylang import guppy

      circ = Circuit(2)
      reg = circ.add_q_register("extra_reg", 3)
      circ.measure_register(reg, "extra_bits")

      guppy_circ = guppy.load_pytket("guppy_circ", circ)

      @guppy
      def foo(default_reg: array[qubit, 2], extra_reg: array[qubit, 3]) -> array[bool, 3]:
         # Note that the default_reg name is 'q' so it has to come after 'e...'
         # lexicographically.
         return guppy_circ(extra_reg, default_reg)

   Any symbolic parameters in the circuit need to be passed as a lexicographically 
   sorted array (if arrays are enabled, else individually in that order) as values of 
   type `angle`.

   The function name is determined by the function variable you bind the `load_pytket`
   method call to, however the name string passed to the method should match this 
   variable for error reporting purposes.

   There is no linearity checking inside pytket circuit functions. Any measurements  
   inside the circuit get returned as bools, but the qubits do not get consumed and the  
   pytket circuit function does not require ownership. You should either make sure you  
   discard all qubits you know are measured during the circuit, or avoid measurements
   in the circuit and measure in Guppy afterwards.

.. autodecorator:: guppylang.decorator.custom_guppy_decorator

.. autofunction:: get_calling_frame
```
