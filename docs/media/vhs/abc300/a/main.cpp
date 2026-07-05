#include <iostream>
using namespace std;
int main() {
    int n, a, b;
    cin >> n >> a >> b;
    for (int i = 1; i <= n; i++) {
        int c;
        cin >> c;
        if (c == a + b) {
            cout << i << endl;
            return 0;
        }
    }
}
