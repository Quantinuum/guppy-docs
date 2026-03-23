---
file_format: mystnb
kernelspec:
  name: python3
---


# Arrays

In Guppy, an array is an ordered collection of objects of the same type, with a size that is fixed and known at compile time. These two properties distinguish arrays from Python lists.

Arrays are mutable: their values can be reassigned at runtime.

An array can be created using the `array` constructor. The type signature is `array[T, n]` where `T` is the type of the data and `n` is the size of the array. 


```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import array

@guppy
def get_array() -> array[int, 3]:
    return array(0, 2, 4)
```

Note that in Guppy it is necessary to annotate both the type and the size of an array in function signatures.

Array entries can be changed as follows:

```{code-cell} ipython3
@guppy
def mutate_array() -> array[int, 3]:
    numbers = get_array() # Create array containing 0, 2 and 4
    numbers[0] = 17 # Change first element to 17
    return numbers # Return modified array

mutate_array.check()
```

Arrays can also be nested, meaning that the elements of an array can themselves be arrays.

```{code-cell} ipython3
@guppy
def get_array_of_arrays() -> array[array[int, 4], 3]:
    return array(array(1, 2, 3, 4), array(2, 4, 6, 8), array(3, 6, 9, 12))

get_array_of_arrays.check()
```

## Indexing into arrays

As in Python, Guppy indices start from zero. In the array `arr = array(0, 2, 4)`  we can access the element `0` with `arr[0]`, `4` with `arr[2]`, and so on.


```{warning}
Although the size of an array is known at compile time, the index may not be. If an index computed at runtime is out of bounds, a runtime error will occur.
```

If our index is an integer literal, the Guppy compiler can detect when the index is out of bounds and give an error. 

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.quantum import h, qubit

@guppy
def index_out_of_bounds1() -> array[qubit, 3]:
    qs = array(qubit() for _ in range(3)) # Allocate an array of length 3
    h(qs[3]) # Access index 3, only (0, 1, 2) indices are within bounds
    return qs

index_out_of_bounds1.check() # Out of bounds error given
```

Note that there are some limitations to this bounds checking. If we write the index as an expression i.e. `qs[2+1]` then the compiler is not able to detect that the index is out of bounds. Also if we assign the value 3 to a variable `x` then `qs[x]` will pass the type check.

```{code-cell} ipython3
@guppy
def index_out_of_bounds2() -> array[qubit, 3]:
    qs = array(qubit() for _ in range(3)) # Allocate an array of length 3
    x = 3 # Assign 3 to a variable
    h(qs[x]) # Index using the variable x
    h(qs[1 + 2]) # Index is an arithmetic expression
    return qs

index_out_of_bounds2.check() # No out of bounds error given
```


## Array comprehensions

We can use array comprehension to create an array object without specifying all of its elements individually. This is especially useful for dealing with large arrays.

Syntactically, Guppy comprehensions are similar to list comprehensions in Python.


```{code-cell} ipython3

@guppy
def get_first_four_squares() -> array[int, 4]:
    return array(x*x for x in range(4))

get_first_four_squares.check()
```

Note that as the size of an array has to be statically known we cannot generalize this function using a generic variable.

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.num import nat

n = guppy.nat_var("n")

@guppy
def get_first_n_squares(n: nat) -> array[int, n]:
    return array(x*x for x in range(n))

get_first_n_squares.check()
```

```{note}
Note that we can generalize this function provided that the value of `n` is known at compile time. 
See the section on [comptime arguments](../comptime.md#compile-time-arguments).
```

For more background on Guppy's static type checker see the section on [Static Compilation and Typing](../static.md).

We cannot use conditional statements in array comprehensions as their values generally can't be known at compile time.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def filter_squares_by_divisor(divisor: int) -> array[int, 3]:
    squares = get_first_four_squares()
    return array(x for x in squares if x % divisor == 0) # Size cannot be determined statically

filter_squares_by_divisor.check()
```


## Array unpacking

The elements within a Guppy array can be accessed via unpacking similarly to Python tuples. To see how unpacking works for Guppy tuples see the [tuple unpacking section](tuples.md#unpacking). 


We can use the `*` operator to unpack multiple elements. 

```{code-cell} ipython3
@guppy
def make_array() -> array[int, 4]:
    return array(5, 10, 15, 20)

@guppy
def unpack_tail(arr: array[int, 4]) -> tuple[int, array[int, 3]]:
    first, *tail = make_array()
    return first, tail


unpack_tail.check()
```

A current limitation of array unpacking is that it is not supported for arrays of generic length. 


```{note}
Note that it in Guppy it is possible to unpack any iterable type.

For example we can unpack a `Range` as follows `first, *tail = range(10)`. 
```

## Moving and copying arrays

Guppy arrays are affine, meaning their value can be used once or not at all. Assignment of arrays does not copy their values into a new array, but just moves the reference.

```{code-cell} ipython3
---
tags: [raises-exception]
---

@guppy
def make_big_array() -> array[int, 96]:
    return array(x*x for x in range(96))

@guppy
def main() -> None:
    arr1 = make_big_array()
    arr2 = arr1 # Move the value arr1 to arr2
    arr1[1] = 17 # Compiler error, arr1 cannot be indexed into after the move

main.check() 
```

Assignment of an array to the new `arr2` variable moves the value of `arr1` to `arr2`. The value of `arr1` cannot be used after it is moved. 

Arrays can still be copied explicitly using the `array.copy()` method if they contain objects with a copyable type. 

```{code-cell} ipython3
@guppy
def main() -> None:
    arr1 = make_big_array()
    arr2 = arr1.copy() # Explicitly copy arr1 and assign to arr2
    arr1[95] = 419 # arr1 can still be used as it hasn't been moved

main.check()  
```

Explicit copying is a design choice with performance implications. Arrays can be large, and copying can be a significant memory overhead.
Array copying therefore has to be explicitly opted into via the `array.copy()` method rather than done implicitly with variable assignment.  

Note that arrays cannot be copied after a move.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def main() -> None:
    arr1 = make_big_array()
    arr2 = arr1 # Move the value arr1 to arr2
    arr3 = arr1.copy() # Compiler error

main.check()
```

Arrays of non-copyable types, such as qubits, cannot be copied. Also if an array contains qubits, it cannot be implicitly discarded.
 It must be discarded explicitly with the `discard_array` function to avoid violating [linearity](../ownership.md#linear-types).

Nested arrays cannot be copied directly. A two-dimensional array can be copied via comprehension as follows.

```{code-cell} ipython3
@guppy
def make_2d_array() -> array[array[int, 3], 3]:
    return array(array(1, 2, 3), array(1, 4, 9), array(1, 8, 27))

@guppy
def main() -> None:
    arr = make_2d_array()
    # arr.copy() # would give a compiler error
    copied_arr = array(inner.copy() for inner in arr)
    copied_arr[1][1] = 31
    

main.check()
```

Note that `for` loops currently take ownership of the iterable, which is useful to keep in mind when you are iterating directly over arrays as opposed to using subscripts:

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.builtins import owned

m = guppy.nat_var("m")

@guppy
def f(x: int) -> None: 
    pass

@guppy
def apply_f(xs: array[int, m] @owned) -> array[int, m]:
    for x in xs:
        f(x)
    return xs

apply_f.check()
```
Explicit copying can come in handy here, if it is possible to do with the array that is being iterated over:

```{code-cell} ipython3
@guppy
def apply_f(xs: array[int, m] @owned) -> array[int, m]:
    for x in xs.copy():
        f(x)
    return xs

apply_f.check()
```

## Example usage of arrays

To see some uses of arrays in practice, refer to the following examples:

1) [Canonical Quantum Phase Estimation](../../guppylang/examples/canonical-qpe.ipynb)
2) [GHZ and Graph State Preparation](../../guppylang/examples/ghz_and_graph.ipynb)
3) [T Factory](../../guppylang/examples/t_factory.ipynb)
