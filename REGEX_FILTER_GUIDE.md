# Filter Query (Regex) - User Guide

The **Filter Query (Regex)** feature in the Chrome GSC Extension allows you to filter keywords using regular expressions (regex) for advanced pattern matching.

## What is Regex?

Regular expressions are powerful patterns for matching text. They allow you to:
- Find keywords that start or end with specific text
- Match keywords containing certain patterns
- Use wildcards and character classes
- Create complex search conditions

## How to Use

1. **Locate the Filter**: In the Advanced Analysis section, find the "Filter Query (Regex)" input field
2. **Enter Pattern**: Type your regex pattern in the input field
3. **Real-time Filtering**: Results are filtered immediately as you type
4. **Visual Feedback**: 
   - Green border = Valid pattern
   - Red border = Invalid pattern (with error tooltip)
5. **Persistence**: Your regex pattern is automatically saved and restored when you reopen the extension

## Common Regex Patterns

### Basic Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `^how` | Starts with "how" | "how to cook", "how do I" |
| `buy$` | Ends with "buy" | "shoes to buy", "where to buy" |
| `.*near.*` | Contains "near" | "restaurants near me", "near my location" |
| `\?$` | Ends with question mark | "what is this?", "how does it work?" |

### Advanced Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `^(how\|what\|why)` | Starts with question words | "how to", "what is", "why does" |
| `.*(buy\|purchase\|order).*` | Contains buying intent | "buy shoes", "purchase online", "order pizza" |
| `[0-9]+.*price` | Contains numbers followed by "price" | "10 dollar price", "2023 price" |
| `^[a-zA-Z]{1,3}$` | Very short keywords (1-3 letters) | "SEO", "API", "CSS" |

### Location-Based Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `.*near me$` | Ends with "near me" | "restaurants near me", "shops near me" |
| `.*(city\|town\|area).*` | Contains location words | "best city guide", "town center" |
| `^[A-Z][a-z]+ [A-Z][a-z]+$` | Proper nouns (cities, names) | "New York", "Los Angeles" |

## Error Handling

### Common Errors

1. **Unmatched brackets**: `[abc` → Should be `[abc]`
2. **Invalid escape sequences**: `\k` → Should be `\\k` for literal backslash
3. **Unmatched parentheses**: `(abc` → Should be `(abc)`
4. **Invalid quantifiers**: `*+` → Should be `.*` or `+`

### Visual Indicators

- **Red border**: Invalid regex pattern
- **Tooltip on hover**: Shows specific error message
- **Status message**: Displays regex compilation errors
- **Console logging**: Detailed debugging information

## Advanced Features

### Case Sensitivity
- All regex patterns are **case-insensitive** by default
- `hello` will match "Hello", "HELLO", "HeLLo"

### Empty Patterns
- Empty input clears the regex filter
- All keywords will be shown (subject to other active filters)

### Pattern Testing
- Use the included `test_regex.html` file to test patterns before applying them
- Console shows filter results: `Regex filter applied: 1000 → 50 items`

## Troubleshooting

### Pattern Not Working?
1. Check for red border indicating syntax error
2. Verify pattern in the test file first
3. Check browser console for detailed error messages
4. Ensure pattern uses JavaScript regex syntax

### Performance Tips
1. Simple patterns are faster than complex ones
2. Avoid overly broad patterns like `.*.*.*`
3. Use specific anchors (`^` and `$`) when possible

### Storage and Persistence
- Regex patterns are automatically saved to Chrome storage
- Patterns persist between extension sessions
- Invalid patterns are not saved
- Clearing extension data will reset saved patterns

## Integration with Other Filters

The regex filter works in combination with:
1. **Filter Pills** (applied first)
2. **Basic Search** (applied before regex)
3. **Advanced Numerical Filters** (applied after regex)
4. **Sorting** (applied last)

## Examples in Practice

### E-commerce Keywords
```regex
.*(buy|purchase|order|shop|store).*
```

### Question-based Keywords
```regex
^(how|what|when|where|why|who|which).*
```

### Local Business Keywords
```regex
.*near (me|my location|here).*
```

### Brand Protection
```regex
^(?!.*competitor_name).*your_brand.*
```

This regex filter feature provides powerful keyword analysis capabilities for advanced SEO professionals and analysts. 