// app/json-components-demo/sampleData.ts

export const simpleJsonObject = {
    name: "John Doe",
    age: 30,
    city: "New York"
};

export const complexJsonObject = {
    id: 1,
    name: "Product X",
    description: "A high-quality product",
    price: 99.99,
    inStock: true,
    categories: ["Electronics", "Gadgets"],
    specifications: {
        weight: "200g",
        dimensions: {
            width: 10,
            height: 5,
            depth: 2
        }
    },
    reviews: [
        {
            user: "Alice",
            rating: 5,
            comment: "Excellent product!"
        },
        {
            user: "Bob",
            rating: 4,
            comment: "Good, but a bit pricey"
        }
    ]
};

export const largeJsonObject = {
    users: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        isActive: Math.random() > 0.5
    })),
    products: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: parseFloat((Math.random() * 100).toFixed(2)),
        category: ["Electronics", "Clothing", "Books", "Home"][Math.floor(Math.random() * 4)]
    })),
    orders: Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        userId: Math.floor(Math.random() * 100) + 1,
        productId: Math.floor(Math.random() * 50) + 1,
        quantity: Math.floor(Math.random() * 5) + 1,
        date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
    }))
};

export const invalidJsonString = `{
    "name": "Invalid JSON,
    "age": 30,
    "city": "Error Town"
}`;

export type JsonDataType = typeof simpleJsonObject | typeof complexJsonObject | typeof largeJsonObject;
