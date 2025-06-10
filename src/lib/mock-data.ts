
export interface Product {
  id: number;
  name: string;
  price: number;
  inventory: number;
  status: "active" | "out_of_stock" | "archived";
  sales: number;
  image: string; // Emoji or URL
  sku: string;
  category: string;
  description?: string;
}

export interface Order {
  id: string;
  customer: string;
  total: number;
  status: "fulfilled" | "pending" | "cancelled" | "processing";
  date: string;
  items: string[]; // Product names or IDs
}

export interface AnalyticsData {
  todaySales: number;
  todayOrders: number;
  conversionRate: number;
  topProduct: string;
  monthlySalesData?: { name: string, sales: number }[];
  categoryDistribution?: { name: string, value: number }[];
}

export interface StoreData {
  products: Product[];
  orders: Order[];
  analytics: AnalyticsData;
}

export const mockStoreData: StoreData = {
  products: [
    { 
      id: 1, 
      name: "Wireless Headphones Pro", 
      price: 129.99, 
      inventory: 45, 
      status: "active",
      sales: 230,
      image: "🎧",
      sku: "WH-001",
      category: "Electronics",
      description: "Experience immersive sound with our top-of-the-line wireless headphones. Featuring noise cancellation and 20-hour battery life."
    },
    { 
      id: 2, 
      name: "Smart Watch Elite", 
      price: 299.99, 
      inventory: 12, 
      status: "active",
      sales: 85,
      image: "⌚",
      sku: "SW-002",
      category: "Wearables",
      description: "Stay connected and track your fitness with this sleek smartwatch. GPS, heart rate monitor, and customizable watch faces."
    },
    { 
      id: 3, 
      name: "Premium Phone Case", 
      price: 24.99, 
      inventory: 0, 
      status: "out_of_stock",
      sales: 1560,
      image: "📱",
      sku: "PC-003",
      category: "Accessories",
      description: "Protect your phone in style with our durable and elegant premium case. Available in multiple colors."
    },
    { 
      id: 4, 
      name: "Organic Coffee Beans", 
      price: 18.50, 
      inventory: 75, 
      status: "active",
      sales: 450,
      image: "☕",
      sku: "CB-004",
      category: "Groceries",
      description: "Start your day right with our ethically sourced, fair-trade organic coffee beans. Rich aroma and smooth taste."
    },
    { 
      id: 5, 
      name: "Yoga Mat Deluxe", 
      price: 45.00, 
      inventory: 30, 
      status: "active",
      sales: 120,
      image: "🧘",
      sku: "YM-005",
      category: "Fitness",
      description: "Enhance your yoga practice with our extra-thick, non-slip deluxe yoga mat. Eco-friendly materials."
    }
  ],
  orders: [
    { 
      id: "#ORD-12345", 
      customer: "John Doe", 
      total: 129.99, 
      status: "fulfilled",
      date: "2025-06-10",
      items: ["Wireless Headphones Pro"]
    },
    { 
      id: "#ORD-12346", 
      customer: "Jane Smith", 
      total: 324.98, 
      status: "pending",
      date: "2025-06-11",
      items: ["Smart Watch Elite", "Premium Phone Case"]
    },
    { 
      id: "#ORD-12347", 
      customer: "Alice Brown", 
      total: 18.50, 
      status: "processing",
      date: "2025-06-11",
      items: ["Organic Coffee Beans"]
    },
    { 
      id: "#ORD-12348", 
      customer: "Robert Green", 
      total: 90.00, 
      status: "fulfilled",
      date: "2025-06-09",
      items: ["Yoga Mat Deluxe", "Yoga Mat Deluxe"]
    },
    { 
      id: "#ORD-12349", 
      customer: "Emily White", 
      total: 299.99, 
      status: "cancelled",
      date: "2025-06-08",
      items: ["Smart Watch Elite"]
    }
  ],
  analytics: {
    todaySales: 12450.50,
    todayOrders: 18,
    conversionRate: 3.2,
    topProduct: "Premium Phone Case",
    monthlySalesData: [
      { name: 'Jan', sales: 4000 },
      { name: 'Feb', sales: 3000 },
      { name: 'Mar', sales: 5000 },
      { name: 'Apr', sales: 4500 },
      { name: 'May', sales: 6000 },
      { name: 'Jun', sales: 5500 },
    ],
    categoryDistribution: [
      { name: 'Electronics', value: 400 },
      { name: 'Wearables', value: 300 },
      { name: 'Accessories', value: 200 },
      { name: 'Groceries', value: 150 },
      { name: 'Fitness', value: 100 },
    ]
  }
};

export type AISuggestion = {
  step: string;
  reason: string;
};
