---
file_format: mystnb
kernelspec:
  name: python3
---

# Differences between Guppy and Python

As explained in the [previous chapter](static.md), Guppy's execution model differs quite significantly from Python's:
instead of using an interpreter, we compile Guppy code into a standalone binary.
This approach leads to better runtime performance and enables us to catch errors at compile-time, but it also means that some of Python’s more dynamic features are not supported.
In this chapter, we outline the key differences between Guppy and standard Python code.

```{note}
The restrictions discussed here apply to regular `@guppy` functions. Guppy also has a special `@guppy.comptime` mode where compilation is driven by the Python interpreter. In that mode, most of the following restrictions no longer apply and Guppy behaves identical to Python. See the corresponding [comptime chapter](comptime.md) for details.
```


## Lists vs Arrays

Guppy uses a special [`array`](guppylang.std.array.array) type instead of lists:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import array

@guppy
def array_example(xs: array[float, 10]) -> bool:
    ys = array(1, 2, 3)
    zs = array(i for i in range(20))  # Array comprehension
    zs[2] = ys[0]
    return zs[3] == xs[0]

array_example.check()
```

The major differences between arrays and regular Python lists are:

* All array elements must have the same type.
* Arrays have a fixed size, so it's not possible to `append` to them.
* Sizes of arrays are tracked in their type. For example, we had to write `xs: array[float, 10]` in the example above, whereas just `xs: array[float]` would not be allowed.
* Arrays don't allow negative indexing or slicing.

See the [chapter on arrays](data_types/arrays.md) for more details and examples.


## Memory Management

Python has automatic memory management using reference counting and a garbage collector.
However, in Guppy we have to handle memory differently since garbage collection is too slow.
The good news is that memory management in Guppy remains automatic, so we don't have to worry about explicitly allocating or freeing memory and related undefined behaviour common in languages like C or C++.
To enable this, Guppy imposes some restrictions on how we can interact with mutable objects.

In Python, we're allowed to have multiple references to the same object:

```{code-cell} ipython3
xs = [0, 1, 2]
ys = xs
ys[0] = 3
xs
```

We see that mutating `ys` also affected `xs` since both variables refer to the same list object.
In Guppy, we're only allowed to have a single reference to mutable objects:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def multiple_references() -> array[int, 3]:
    xs = array(0, 1, 2)
    ys = xs
    ys[0] = 3
    return xs

multiple_references.check()
```

The compiler tells us that we have *moved* the array from variable `xs` into variable `ys`, so we're no longer allowed to access `xs` afterwards.
It also suggests that we could assign a *copy* of the array to `ys` instead of moving it, so the following compiles successfully:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def make_copy() -> array[int, 3]:
    xs = array(0, 1, 2)
    ys = xs.copy()  # Assign copy to `ys`
    ys[0] = 3
    return xs

make_copy.check()
```

Of course, making copies of large arrays comes at a performance cost, so Guppy will only do it if we explicitly call `copy()`.
Similarly, by default we're not allowed to move mutable objects out of function arguments:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def move_argument(xs: array[int, 3]) -> None:
    ys = xs
    ys[0] = 3

move_argument.check()
```

Again, we could make a copy of `xs` to fix the error, however the compiler also suggests that we could *take ownership* of `xs` instead.
Ownership is Guppy's way of tracking which function scope a given object belongs to.
Taking ownership of an argument would move it into the scope of the function and allow us to reassign it as we please.
The [chapter on ownership](ownership.md) explains this system in more detail and in particular how it applies to qubits.


## Classes vs Structs

Guppy allows us to define struct types to group data together, similar to [dataclasses](https://docs.python.org/3/library/dataclasses.html) in Python:

```{code-cell} ipython3
@guppy.struct
class InventoryItem:
    """Struct for keeping track of an item in inventory."""
    name: str
    unit_price: float
    quantity_on_hand: int

    @guppy
    def total_cost(self: "InventoryItem") -> float:
        return self.unit_price * self.quantity_on_hand
```

Guppy structs are more restrictive than regular Python classes:

* All structs are immutable.
* No custom `__init__` constructors.
* All struct fields and their types must be explicitly declared. Dynamically adding or removing fields as well as [`hasattr`](https://docs.python.org/3/library/functions.html#hasattr), [`getattr`](https://docs.python.org/3/library/functions.html#getattr), and [`setattr`](https://docs.python.org/3/library/functions.html#setattr) are not allowed.
* Adding or reassigning methods outside the class definition is not allowed.
* Struct types cannot be dynamically created at runtime, they must be declared using the `class` syntax.

See the [chapter on structs](data_types/structs.md) for further details and more usage examples.


## Integers

Guppy uses 64-bit integers instead of Python's unbounded big-ints:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def too_big() -> int:
    return 9_223_372_036_854_775_808

too_big.check()
```

While the compiler catches size problems for integer literals, arithmetic operations on integers generally overflow or underflow when exceeding the 64-bit range.

By default, Guppy treats all integer literals as *signed* integers.
However, we can annotate a value as `nat` if we want an *unsigned* 64-bit integer:

```{code-cell} ipython3
from guppylang.std.builtins import nat

@guppy
def big_nat() -> nat:
    x: nat = 9_223_372_036_854_775_808  # Fits into 64-bit unsigned integer
    return x

big_nat.check()
```


## I/O

Guppy doesn't support the `print` function.
Program outputs must be reported using the `output` function that takes a static string tag along with the value that should be outputted:

```{code-cell} ipython3
@guppy
def output_example() -> None:
    output("my_computation", 1 + 1)
    output("other_output", array(1.5, 2.5, 3.5))

output_example.check()
```

After running a program, the outputs are reported as tag-value pairs:

```{code-cell} ipython3
output_example.emulator(1).run().results
```

## Exceptions

When something goes wrong in a Python program, we typically throw an exception.
Guppy on the other hand provides a `panic` function that that can be used to exit the program if something unexpected happens:

```{code-cell} ipython3
@guppy
def division(a: int, b: int) -> float:
    if b == 0:
        panic("Division by zero!")
    return a / b

division.check()
```

Also see our [postselection example](../guppylang/examples/postselect) for use cases of `panic` and the related `exit` function.

Importantly, panics cannot be caught since Guppy does not support `try`-`catch` statements.
If we want to write a function that can recover from an error condition, then we could use the [`Option`](guppylang.std.option.Option) type from the Guppy standard library to represent partial functions:

```{code-cell} ipython3
from guppylang.std.option import Option, some, nothing

@guppy
def division_checked(a: int, b: int) -> Option[float]:
    if b == 0:
        return nothing()
    return some(a / b)

division_checked.check()
```

See the [API documentation](guppylang.std.option.Option) as well as our [T state distillation example](../guppylang/examples/t_factory) for further details on how to interact with `Option` values 

## Parallel Execution Semantics

In python, programs behave as if every statement was executed in exactly the
order the statements were written.

Guppy relaxes this idea in a few ways to fit with the way modern and quantum
computers may execute parts of a program in parallel, as follows.

(Note: these guarantees are for guppylang v1, they may become more relaxed
in future major releases. Also just that we *allow* statements to be reordered
does not mean that this will necessarily happen in practice - but this may
change, within the bounds of this spec, in future *minor* releases.)

1. Operations that panic (both explicit `panic`s and other ops like array indexing) may be reordered with respect to each other. For example, this program:
```
@guppy
def foo(i: int) -> int:
  if i < -10:
    panic("Input was very negative!", i)
  if i < 0:
    panic("Input was negative!", i)
  return i
```
A call such as `foo(-20)` will definitely panic, but may panic with either message. As a second example:
```
@guppy
def bar(arr: array[int, 3], i : int) -> int:
   if i % 2 == 1:
      panic("i should have been even!")
   return arr[i]
```
The call `bar(arr, 5)` may fail with *either* that the index was out of bounds
for the array of 3 elements, *or* the message `i should have been even`.

2. However, the following *are* guaranteed for all v1.x:
* A `panic` (explicit or implicit) and an `output` will happen in the same order they are written in the source code.
* Multiple `output`s will occur in the order they are present in the source code. **[At least for v1]**
* `panic` and `exit` will not be reordered: the exit code will be the same as for python
* `exit` and `output` will not be reordered

**We have not specified whether `panic` and `output` can be reordered, and we should.**

### Semantics of v1.0 release

To document the behaviour of the current v1.0 release, but not as a guarantee about future minor **[or even patch]** releases, reordering of panics only occurs for indexing operations on arrays with linear or affine elements (explicit `take`, or borrowing of elements to pass to functions), which may be reordered with respect to
* other indexing operations on *different arrays*
* `result`, `panic`, or `exit` operations
* (that is, they may be reordered with respect to any operation *not* on the same array)

For example,
```
@guppy
def baz[n,m](arr1: array[qubit, n], arr2: array[qubit, m]) -> None:
    h(arr1[10])
    h(arr2[11])
```
If `a1` has fewer than 11 elements, or `a2` fewer than 12, then `baz` will panic
(just as python). However, if both these problems occur in the same call to `baz`
then v1.0 does not guaranteed which array access will be reported as failing. Similarly:
```
@guppy
def foo(arr1: array[qubit, 3], i: int) -> None:
  h(arr1[i])
  if i < 1:
    panic("Index was not strictly greater than zero)
```
seeing the message "Index was...." does not necessarily mean that the array access succeeded and thus that i==0; it could also occur for out-of-range i<0.

<!-- on copyable-element arrays, `take` compiles to `get`,
and `get` although not ordered itself is always compiled with an `unwrap` that *is* ordered -->


