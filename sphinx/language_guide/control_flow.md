---
file_format: mystnb
kernelspec:
  name: python3
---

# Control flow

A major feature of Guppy is that it enables you to write hybrid quantum programs with classical control flow and mid-circuit measurements - with control flow working as you would expect from Python.

## Conditionals 

The usual `if`, `else`, `elif` statements are available.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.quantum import qubit, measure
from guppylang.std.builtins import owned

@guppy
def outcome_message(q: qubit @owned) -> str:
    if measure(q):
        return "Measured 1!"
    else:
        return "Measured 0!"

outcome_message.check()
```


## Loops and recursion

You can use `for` loops.

```{code-cell} ipython3
from guppylang.std.quantum import h, cx
from guppylang.std.builtins import array

n = guppy.nat_var("n")

@guppy
def entangle(qs: array[qubit, n]) -> None:
    h(qs[0])
    for i in range(len(qs)):
        if i != 0:
            cx(qs[0], qs[i])

entangle.check()
```


You can also use `while` loops, with `break`, `continue`, and early  `return` statements available for controlling the loops. 

We can put all these together for this simplified example where we make sure the qubit is in the $\ket{1}$ state before proceeding:

```{code-cell} ipython3
from guppylang.std.quantum import measure, x

@guppy
def repeat_until_success_iter() -> None:
    while True:
        q = qubit()
        x(q)

        if not measure(q).read():
            continue

        # Do something with the qubit here.
        break

repeat_until_success_iter.check()
```

Guppy also supports recursion, so you could also rewrite the function above in the following manner:

```{code-cell} ipython3
@guppy
def repeat_until_success_rec() -> None:
    q = qubit()
    x(q)

    if not measure(q).read():
        repeat_until_success_rec()

    # Do something with the qubit here.

repeat_until_success_rec.check()
```

## Further control flow features

In addition, Guppy provides two functions for terminating programs early which can be particularly useful when controlling quantum shot execution: `panic` can be used to signal an unexpected error that ends both the current shot and execution in general, while `exit` will end the current shot but then still continue with the next one. You can find a more detailed explanation in the postselection example. 

More advanced python control flow constructs such as `match` can be used through compile-time evaluation with `comptime`, see the [relevant section](comptime.md) for guidance.