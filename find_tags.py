import re

content = open("src/pages/Admin.tsx", "r", encoding="utf-8").read()

# We only care about major block elements to find structural leaks
# This is a naive but effective tag depth checker

lines = content.split('\n')
stack = []
for i, line in enumerate(lines):
    # Strip string literals to avoid confusing the parser
    # Very naive 
    text = re.sub(r'".*?"|\'.*?\'|`.*?`', '', line)
    
    # find all opening JSX tags that aren't self closing <Tag ... > (excluding <Tag ... />)
    opens = re.findall(r'<([A-Z][a-zA-Z0-9]*|[a-z]+)(?![^>]*/>)[^>]*>', text)
    # find all closing JSX tags </Tag>
    closes = re.findall(r'</([A-Z][a-zA-Z0-9]*|[a-z]+)>', text)
    
    # Filter out empty or self-closing-ish matches mistakenly caught
    # And handle tags
    for tag in opens:
        if tag not in ["img", "input", "br", "hr"]: 
            stack.append((tag, i+1, line.strip()))
    for tag in closes:
        if len(stack) > 0 and stack[-1][0] == tag:
            stack.pop()
        else:
            print(f"Mismatch at line {i+1}: expected {stack[-1] if stack else 'empty'} but got </{tag}>. Line: {line.strip()}")
            
print("Remaining stack:", stack)
