# Definitions

```{eval-rst}
.. currentmodule:: guppylang.defs
.. autoclass:: GuppyDefinition
    
    .. automethod:: compile
    .. automethod:: check

.. autoclass:: GuppyFunctionDefinition
    :show-inheritance:

    .. automethod:: __call__
    .. automethod:: compile
    .. automethod:: compile_function
    .. automethod:: compile_entrypoint
    .. automethod:: check
    .. automethod:: emulator 

.. autoclass:: GuppyTypeVarDefinition
    :show-inheritance:

    .. automethod:: compile
    .. automethod:: check
    .. automethod:: __eq__
    .. automethod:: __getattr__

.. autoclass:: GuppyEnumDefinition
    :show-inheritance:

    .. automethod:: __getattr__

.. autoexception:: EntrypointArgsError
```