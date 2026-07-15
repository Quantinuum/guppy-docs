---
file_format: mystnb
kernelspec:
  name: python3
---

# Type Argument Syntax

Guppy makes use of the python's [type parameter syntax](https://docs.python.org/3/reference/compound_stmts.html#type-params), introduced in python 3.12 (see: [PEP 695](https://peps.python.org/pep-0695/)).

This means that type arguments can be given explicitly using square brackets when calling a function. Using this syntax, guppy function signatures can be written like:

```python
def foo[A, B](a: A, b: B) -> B:
```

These guppy functions have type parameters `A: Type, B: Type`, and `a: Type`. Their type arguments can be specified explicitly by callers:

```python
foo[int, str](42, "guppy")
```

Usually these type arguments can be left to be inferred by the type checker.

### Bounds
Generic functions can have their type bounds specified by an annotation in the type parameter list. In guppy these bounds can mean three things:
#### Linearity
The type argument can be required to be copyable and/or droppable using the `Copy`, `Drop` bounds:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.lang import Copy, Drop

@guppy
def copy[T: (Copy, Drop)](t: T) -> tuple[T, T]:
    return t, t
```

#### Const arguments
By default, a type parameter specified in this way represents an arbitrary type. We can also add annotations to the parameters.

These annotations can also be used to specify that the parameter is a _const nat_ parameter, rather than a type:

```{code-cell} ipython3
from guppylang.std.builtins import array

@guppy
def replicate[T: (Copy, Drop), N: nat](elem: T) -> array[T, N]:
    return array(elem for _ in range(N))
```

#### Protocol bounds
 Type parameter syntax is used to specify the _protocols_ that a type argument must implement. In the below example, any type argument `T` to the function `foo` must implement the `MyProto` protocols.

Assuming we've defined a protocol, `MyProto`:
```{code-cell} ipython3
@guppy.protocol
class MyProto[T]:
    @guppy.require
    def foo[T](self, t: T) -> None: ...
```

we can require that it is implemented by a type arg `T` by writing:

```{code-cell} ipython3
 @guppy
 def baz[T: MyProto](t: T) -> None:
     return t.foo()

 ```

### Type Arguments to Classes
guppy structs and protocols can also take type parameters in the same way. The type parameters will be in scope for the signatures of the methods:

```{code-cell} ipython3
@guppy.struct(frozen=True)
class MyStruct[T]:
    @guppy
    def foo(self, t: T) -> None:
        return

    @guppy
    def bar[S](self, s: S, t: T) -> None:
        return self.foo(t)

@guppy
def myfoo() -> None:
    return baz(MyStruct[int]())
```

### Type aliases
Type variables for guppy type aliases must still be declared in the python 3.10 style:

```{code-cell} ipython3
T = guppy.type_var("T")
NatPair = guppy.type_alias("NatPair", "tuple[T, nat]", params=[T])
```
They can then be instantiated with type argument syntax, i.e. in the above example, `NatPair[int]` is an alias for `tuple[int, nat]`.
This is also works for constant arguments -- below `QArr[4]` is an alias for `array[qubit, 4]`.

```{code-cell} ipython3
N = guppy.nat_var("N")
QArr = guppy.type_alias("QArr", "array[qubit, N]", params=[N])
```

### Caveats
* Note that guppy type parameters stand in for one type or constant. Python's `TypeVarTuple` and `ParamSpec` parameters (written as `*T` and `**P`, respectively) aren't supported.
