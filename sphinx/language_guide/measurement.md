---
file_format: mystnb
kernelspec:
  name: python3
---

# Measurements

When you call measurement functions such as `std.quantum.measure` in Guppy, the value they return has type `Measurement`. This is a copyable type that you can pass around your program until you need the measurement as a boolean, at which point you should call `read` on it. This will block program execution until the value is available.

Separating the point in your program where you request a measurement from the point where you explicitly call `read` can give the underlying runtime more opportunities for parallelism and can therefore improve performance.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import owned
from guppylang.std.quantum import measure, qubit

@guppy
def deferred_measurement(q: qubit @ owned) -> None:
    m = measure(q) # measurement requested here
    #   ● 
    #   │
    #   │  <- other quantum operations can be parallelised
    #   │     here while this measurement resolves
    #   ▼
    output("q", m.read()) # result needed here at the latest - blocks until ready

deferred_measurement.check()
```

For convenience, boolean coercion via `__bool__` is implemented on the type, so `read` is called automatically in conditionals.

```{code-cell} ipython3
@guppy
def conditional_output(q: qubit @ owned) -> None:
    if measure(q):
        output("true", 1)
    else:
        output("false", 0)

conditional_output.check()
```

For reading an array of measurements, use `collect_measurements`.

```{code-cell} ipython3
from guppylang.std.builtins import array
from guppylang.std.quantum import measure_array, collect_measurements

@guppy
def output_array(qs: array[qubit, 10] @ owned) -> None:
    ms = measure_array(qs)
    # [... more quantum operations ...]
    output("qs", collect_measurements(ms))

output_array.check()
```