Output demo.gif

Set FontSize 18
Set Width 1200
Set Height 700
Set TypingSpeed 100ms
Set Theme "Catppuccin Macchiato"

# Move to the task directory and clean terminal
Type "atc init" Enter
Sleep 1s
Left 1
Sleep 0.5s
Enter
Sleep 0.5s
Enter
Sleep 0.5s
Enter
Sleep 1s

Type "atc new abc300" Enter
Sleep 2s
Enter
Sleep 5s

# 1. Run local tests and fail (WA)
Type "atc test abc300 a" Enter
Sleep 4.5s

# 2. Write the correct solution (simulate typing)
Type "cat << 'EOF' > abc300/a/main.cpp" Enter
Sleep 500ms
Set TypingSpeed 20ms
Type "#include <iostream>" Enter
Type "using namespace std;" Enter
Type "int main() {" Enter
Type "    int n, a, b;" Enter
Type "    cin >> n >> a >> b;" Enter
Type "    for (int i = 1; i <= n; i++) {" Enter
Type "        int c;" Enter
Type "        cin >> c;" Enter
Type "        if (c == a + b) {" Enter
Type "            cout << i << endl;" Enter
Type "            return 0;" Enter
Type "        }" Enter
Type "    }" Enter
Type "}" Enter
Type "EOF" Enter
Sleep 1.5s

# 3. Run local tests again and pass (AC)
Set TypingSpeed 100ms
Type "atc test abc300 a" Enter
Sleep 5s
