---
file_format: mystnb
kernelspec:
  name: python3
---

# Custom Metadata

Guppy supports adding arbitrary metadata to symbols that will be lowered to the final compilation product (the HUGR package). You can do this via the {py:deco}`guppylang.decorator.metadata` decorator, which you can add below the {py:deco}`guppylang.decorator.guppy` decorator:

```{code-cell} ipython3
from hugr.ops import FuncDefn
from guppylang import guppy
from guppylang.decorator import metadata

@guppy
@metadata("my-key", {"arbitrary": ["value"]})
def my_func() -> None:
    pass

package = my_func.compile()

funcs = [v for v in package.modules[0].values() if isinstance(v.op, FuncDefn)]
assert len(funcs) == 1
assert funcs[0].metadata["my-key"] == {"arbitrary": ["value"]}
```
Note that only functions currently compile to objects that can have metadata attached. Types on the other hand, like structs and enums, do not.

If you have keys that you use often, you may want to create your own decorator simply by wrapping {py:deco}`guppylang.decorator.metadata`:
```{code-cell} ipython3
from hugr.ops import FuncDefn
from guppylang import guppy
from guppylang.decorator import metadata

def my_wonderful_metadata(value: str):
    return metadata("my-wonderful-key", value)

@guppy
@my_wonderful_metadata("a-wonderful-value")
def my_func() -> None:
    pass

package = my_func.compile()

funcs = [v for v in package.modules[0].values() if isinstance(v.op, FuncDefn)]
assert len(funcs) == 1
assert funcs[0].metadata["my-wonderful-key"] == "a-wonderful-value"
```

The Guppy compiler contains some examples of this wrapper mechanism, including ones where the metadata is used in the Guppy compiler itself, like:
- The {py:deco}`guppylang.library.link_name` decorator, see [](libraries.md#linking-and-visibility).
- The {py:deco}`guppylang.decorator.expected_qubits` decorator, see [](../api/emulator.md).

