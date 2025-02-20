export const CODE_SNIPPETS = {
    // Frontend Snippets
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Welcome to my webpage.</p>
    <button onclick="alert('Hello!')">Click me</button>
</body>
</html>`,

    css: `/* Basic styles */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f0f0f0;
}

h1 {
    color: #333;
    text-align: center;
}

.button {
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.button:hover {
    background-color: #0056b3;
}`,

    javascript: `function sum(a, b) {
  return a + b;
}
console.log(sum(3, 4));`, // Output: 7

    typescript: `function sum(a: number, b: number): number {
  return a + b;
}
console.log(sum(3, 4));`,

    // Backend Snippets (existing)
    python: `def sum(a, b):
    return a + b
print(sum(3, 4))`,

    php: `function sum($a, $b) {
    return $a + $b;
}
echo sum(3, 4);`,

    ruby: `def sum(a, b)
    a + b
end
puts sum(3, 4)`,

    rust: `fn sum(a: i32, b: i32) -> i32 {
    a + b
}
fn main() {
    println!("{}", sum(3, 4));
}`,

    "csharp.net": `public class Program
{
    public static int Sum(int a, int b)
    {
        return a + b;
    }
}
class MainClass
{
    public static void Main (string[] args)
    {
        Console.WriteLine(Program.Sum(3, 4));
    }
}`,

    "c++": `int sum(int a, int b) {
    return a + b;
}
int main() {
    std::cout << sum(3, 4);
    return 0;
}`,

    go: `func sum(a, b int) int {
    return a + b
}
func main() {
    fmt.Println(sum(3, 4))
}`,

    java: `public class Main {
    public static int sum(int a, int b) {
        return a + b;
    }
    public static void main(String[] args) {
        System.out.println(sum(3, 4));
    }
}`,

    c: `int sum(int a, int b) {
    return a + b;
}
int main() {
    printf("%d", sum(3, 4));
    return 0;
}`
};