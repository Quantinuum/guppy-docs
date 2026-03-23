r"""Configuration file for the Sphinx documentation builder."""

import os
import guppylang


html_title = f"Guppy v{guppylang.__version__} Documentation"

html_theme = "quantinuum_sphinx"
html_theme_options = {
    "sidebar_hide_name": False,
}

html_show_sourcelink = False
html_copy_source = False


html_logo = "_static/guppy_icon_only.svg"
html_favicon = "_static/quantinuum_favicon.svg"

html_static_path = ["_static"]
templates_path = ["_templates"]

master_doc = "index"
author = "Quantinuum"

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.coverage",
    "sphinx.ext.viewcode",
    "sphinx.ext.autosummary",
    "myst_nb",
    "sphinx_copybutton",
    "sphinx.ext.mathjax",
    "sphinx.ext.intersphinx",
    "sphinx.ext.autosectionlabel",
    "sphinxcontrib.googleanalytics",
    "quantinuum_sphinx",
]
autosectionlabel_prefix_document = True


# Sphinx autosummary
# https://www.sphinx-doc.org/en/master/usage/extensions/autosummary.html

# See https://github.com/quantinuum/guppylang/pull/1028
autosummary_ignore_module_all = False  # Respect __all__ if specified


# Resolve some "duplicate names" which Sphinx complains about
# TODO Ensure that builtins.bool redirects to bool.bool
autosummary_filename_map = {
    "guppylang.std.builtins.Option": "guppylang.std.option.Option",
    "guppylang.std.builtins.array": "guppylang.std.array.array",
    "guppylang.std.builtins.bool": "guppylang.std.bool.bool",
    "guppylang.std.builtins.float": "guppylang.std.num.float",
    "guppylang.std.builtins.int": "guppylang.std.num.int",
    "guppylang.std.builtins.SizedIter": "guppylang.std.iter.SizedIter",
    "guppylang.std.builtins.list": "guppylang.std.list.list",
    "guppylang.std.builtins.str": "guppylang.std.string.str",
    "guppylang.std.builtins.range": "guppylang.std.iter.range",
    "guppylang.std.iter.Range": "guppylang.std.iter.range",
}
# ---------------------------------------------------------------------


# --- MyST-parser config ---
myst_heading_anchors = 4

myst_enable_extensions = [
    "dollarmath",
    "html_image",
    "attrs_inline",
    "colon_fence",
    "amsmath",
]
# --------------------------

# --- MyST-NB config ---
# https://myst-nb.readthedocs.io/en/latest/configuration.html
nb_execution_mode = "cache"
nb_execution_show_tb = True  # Show traceback if cell execution fails
nb_execution_raise_on_error = True  # Cell execution failures are errors not warnings
nb_execution_timeout = 90  # Cells which take >90s give timeout error.
nb_merge_streams = True  # Accumulates all stdout streams into one, same with stderr
# ----------------------


# Don't warn about cell highlighting fails. This is because some Guppy compiler
# tracebacks lead to a lexing failure in ipythontb.
# See https://github.com/quantinuum-dev/guppy-docs/pull/51#issuecomment-2757314376
suppress_warnings = [
    "misc.highlighting_failure",
    "autosectionlabel.guppylang/guppylang/CHANGELOG",
]

exclude_patterns = [
    "_build",
    "build/**",
    "**.ipynb_checkpoints",
    "**.pyc",
    "**.py",
    ".venv",
    ".env",
    "**/README.md",
    ".jupyter_cache",
    "jupyter_execute",
    "guppylang_internals/**",
    "guppylang/docs/**",
    "guppylang/tests/**",
    "guppylang/guppylang-internals/CHANGELOG.md",
    "guppylang/quickstart.md",
    "guppylang/DEVELOPMENT.md",
    # QAOA example excluded until https://github.com/Quantinuum/guppylang/issues/1546 is resolved.
    "guppylang/examples/qaoa_maxcut_example.ipynb",
]


# Sphinx link checks
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-the-linkcheck-builder
linkcheck_exclude_documents = ["guppylang/guppylang/CHANGELOG"]

linkcheck_ignore = [
    "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html",
    "https://docs.quantinuum.com/selene",
]

linkcheck_rate_limit_timeout = 100

# Intersphinx
# https://www.sphinx-doc.org/en/master/usage/extensions/intersphinx.html

intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
    "nexus": ("https://docs.quantinuum.com/nexus/", None),
    "pytket": ("https://docs.quantinuum.com/tket/api-docs/", None),
    "hugr": ("https://quantinuum.github.io/hugr/", None),
}

intersphinx_disabled_reftypes = ["*"]

# Sphinx coverage checks
# https://www.sphinx-doc.org/en/master/usage/extensions/coverage.html

coverage_modules = ["guppylang"]

coverage_statistics_to_stdout = False
coverage_show_missing_items = True

coverage_ignore_modules = [
    "guppylang.std.unsupported",
    "guppylang.std.array",
    "guppylang.module",
]

# These classes and functions are shown in the docs but seem to be
# flagged by coverage checks anyway.
coverage_ignore_pyobjects = [
    "EmulatorInstance",
    "EmulatorResult",
    "EmulatorBuilder",
    "PartialState",
    "PartialVector",
    "NotSingleStateError",
    "PriorityQueue",
    "Stack",
]

coverage_ignore_functions = [
    "empty_priority_queue",
    "empty_stack",
]
# -------------------------------------------------------------------
# Google analytics

gaid = os.getenv("GOOGLE_ANALYTICS_ID", "G-YPQ1FTGDL3")
googleanalytics_id = gaid

master_doc = "index"

# Exclude unsupported members of guppylang.std
from guppylang.std import unsupported  # noqa: E402


def skip_member(app, what, name, obj, skip, options):
    if name in dir(unsupported):
        return True
    return None


def setup(app):
    app.connect("autodoc-skip-member", skip_member)
