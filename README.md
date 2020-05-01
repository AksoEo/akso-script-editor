# AKSO Script Editor
A graphical editor for [AKSO Script](https://github.com/AksoEo/akso-script-js).

## ASCT
```hs
definition-name = definition_value

null-value = null
a-boolean = yes
a-number = 1
a-string = "Text goes here"
a-string' = "strings can be multiline
because it'd be harder to parse if this weren't allowed
\" escape using backslashes"

r#"raw identifier"# = "use these for weird identifier names"
r#####"use as many # as needed"##### = null

a-list = [1, 2, 3, 4]

call-a-function = sum(a-list)

define-a-function = (argument1, argument2) -> argument1 + argument2

where-clauses = (a, b) -> c
    where
        c = a * (d + b)
        d = 1

switch-clauses = switch
    a-boolean == yes => "option 1"
    a-number == 3 => "option 2"
    otherwise "option 3"

complex-expr = (a, b) -> a +
    switch
        a == 0 => 0
        a < 2 => 2
        otherwise a * 2
    + c
    where
        c = b / a
```

### Development
- Build with `npx rollup -c`
- Test by starting any ordinary http server (e.g. `python -m "http.server"`) and going to /test/ in a recent browser

#### Overview
This project is very fragmented in terms of “ways you can do UI,” including:

- svg for most of the main app
- html for the code editor
- preact for misc widgets

The SVG UI framework's main purpose is not to be laggy like HTML/CSS, which is accomplished by:

- not recalculating layout for the entire app every frame

Instead, `needsLayout` is used to mark a change that requires layout, and only the views marked with needsLayout (and perhaps a few more) will be updated. `Transaction` objects can be used to do smooth animation between state changes without a big performance impact.

The SVG UI is very bad for accessibility, in which case text mode should be used.
