---
file_format: mystnb
kernelspec:
  name: python3
---

# Tuples

## Basic properties

In Guppy, tuples are immutable sequences of values. The values within a tuple can be of different types. Similarly to arrays, tuples have a length that is fixed when the object is created. 
The behavior of Guppy tuples mostly aligns with Python [^cite_python_tuple_docs] with some key differences as we shall see.

As with Python, we can make a tuple by separating some values with commas.

```{code-cell} ipython3
from guppylang import guppy

@guppy
def make_tuple() -> tuple[int, int, float, str]:
    return 17, 18, 5.94, "Guppy"
```

As tuples are immutable objects, all of their values must be specified when the object is created. 
Immutability also means there is no real reason to copy a tuple once it is created. 
Unlike arrays, tuples have no `copy` method.
 As in Python, we can create a reference to a tuple once it is created by assigning a tuple to a new variable.

 There are two ways to access elements within a tuple. These are indexing and unpacking.

 ## Indexing

 We can create an instance of the tuple above and access the string element by passing the appropriate index.

```{code-cell} ipython3
@guppy
def get_string() -> str:
    my_tuple = make_tuple() # Create (17, 18, 5.94, "Guppy")
    return my_tuple[3] # Extract the "Guppy" string

get_string.check()
```

In Guppy, indexing starts from zero. This means that `my_tuple[0]` would give us the `17` element.

Note that if we instead take an index as a function parameter, the function will fail a type check.


```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def get_string2(i: int) -> str:
    my_tuple = make_tuple() # Create (17, 18, 5.94, "Guppy")
    return my_tuple[i] # Extract the "Guppy" string

get_string2.check()
```

This doesn't type check as the value of `i` is unknown meaning that it is not possible to know the correct return type for the function at compile time. 
Only one element of `my_tuple` is a string so the only valid index would be `my_tuple[3]`.

## Unpacking

The values within a tuple can be accessed by unpacking. Let's create a tuple with the `make_tuple` function and return a new tuple with only the integer and float values.


```{code-cell} ipython3
@guppy
def unpack_numbers() -> tuple[int, int, float]:
    i1, i2, f, _ = make_tuple() # Create (17, 18, 5.94, "Guppy")
    return i1, i2, f

unpack_numbers.check()
```

Note that in the example above the two integer values inside the tuple are bound to the variables `i1` and `i2`. The float value is assigned to the variable `f`.


We can also unpack values from a tuple using the `*` operator.

```{code-cell} ipython3
from guppylang.std.builtins import array

@guppy
def make_tuple2() -> tuple[float, int, int, int]:
    return (0.01, 2, 9, 6)

@guppy
def unpack_tail() -> array[int, 3]:
    initial, *tail = make_tuple2()
    return tail # Returns array(2, 9, 6)

unpack_tail.check()
```

Note as values 2, 9 and 6 are of the same type they are unpacked as an array.

Unpacking can also be used to swap values. We can swap the labels of two qubits `q1` and `q2` as follows.

```{code-cell} ipython3
from guppylang.std.quantum import qubit, h

@guppy
def unpack_swap() -> tuple[qubit, qubit, qubit]:
    q1, q2, q3 = qubit(), qubit(), qubit()
    h(q1)
    q1, q2 = q2, q1
    return (q1, q2, q3)

unpack_swap.check()
```

## Differences from Python tuples

By design, Guppy tuples behave similarly to Python tuples. However there are a number of differences which are 
useful to bear in mind. These differences reflect the design of the Guppy type system which is motivated by type safety.

### The `tuple` keyword

In Python, we can create a tuple either through literals of comma separated values or with the `tuple` keyword. In Guppy, only the former method of creating a tuple will work. In Guppy, this keyword is only used in type annotations.


### Unpacking with `*`

Above we saw an example where we used `*` to unpack last three elements of the tuple `(0.01, 2, 9, 6)`. This tuple consists of a single float followed by three integers.

What would happen if we tried to unpack the first three values of the tuple instead?

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def unpack_head() -> tuple[float, int, int]:
    *head, final = make_tuple2() # Try to unpack (0.01, 2, 9, 6)
    return head # Try to return (0.01, 2, 9)

unpack_head.check()
```

What's gone wrong here? The problem is that Guppy only allows unpacking with the `*` operator if all of the values unpacked are of the same type. As the first three values of our tuple `(0.01, 2, 9, 6)` do not have the same type we get a compiler error.

[^cite_python_tuple_docs]: Python Software Foundation. Python Tutorial, [Section 5.3: Tuples and Sequences](https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences).
