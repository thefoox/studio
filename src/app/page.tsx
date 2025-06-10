
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { 
  Send, Plus, Package, ShoppingCart, Users, BarChart3, Settings, Search, Filter, Edit, Trash2, Eye, 
  TrendingUp, DollarSign, AlertCircle, CheckCircle, Clock, MessageCircle, LayoutGrid, ArrowLeft, 
  Download, Bell, BotMessageSquare, User, Palette, BrainCircuit, Sparkles, ImageUp, X, Store, Link as LinkIcon // Added Store, LinkIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockStoreData, StoreData, Product, Order, AnalyticsData, AISuggestion } from '@/lib/mock-data';
import { suggestNextSteps, SuggestNextStepsInput } from '@/ai/flows/suggest-next-steps';
import { generateProductDescription, GenerateProductDescriptionInput } from '@/ai/flows/generate-product-description';
import { analyzeProductImage, AnalyzeProductImageInput, AnalyzeProductImageOutput } from '@/ai/flows/analyze-product-image-flow';
import { queryShopifyAgent, ShopifyAgentInput, ShopifyAgentOutput } from '@/ai/flows/shopify-agent-flow'; // New Shopify Agent
import { useToast } from "@/hooks/use-toast";
import { getShopInfo, ShopifyProduct as ServiceShopifyProduct } from '@/services/shopify-service'; // Import Shopify service & type

type UIMode = 'conversational' | 'traditional';
type TraditionalView = 'dashboard' | 'products' | 'orders' | 'customers' | 'reports' | 'settings';

interface AIProductContext {
  imageDataUrl?: string | null;
  category?: string;
  tags?: string[];
  initialDescription?: string;
  productName?: string;
  fullDescription?: string;
}

interface AIMessage {
  id: number;
  text?: string;
  sender: 'ai' | 'user';
  timestamp: Date;
  type?: 'welcome' | 'product_list' | 'add_product_form' | 'orders_list' | 'analytics_dashboard' | 'help' | 'product_description_result' | 'error' | 'image_analysis_result' | 'user_image_upload' | 'confirm_product_name' | 'request_features_for_description' | 'product_added_confirmation' | 'shopify_agent_response' | 'shopify_product_card';
  data?: any; 
  actions?: { text: string; action: string; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined }[];
}

interface ShopInfoState {
  name: string;
  email: string;
}

const quickActionsConfig = [
  { id: "dashboard", text: "Dashboard", icon: LayoutGrid, action: "dashboard" },
  { id: "products", text: "Products", icon: Package, action: "products" },
  { id: "orders", text: "Orders", icon: ShoppingCart, action: "orders" },
  { id: "customers", text: "Customers", icon: Users, action: "customers" },
  { id: "reports", text: "Analytics", icon: BarChart3, action: "reports" },
];

export default function HybridAdminPanelPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<UIMode>('conversational');
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 1,
      text: "Welcome to your AI-Commerce Command Center! I'm here to help you manage your store efficiently. How can I assist you today? You can also upload a product image for analysis or ask about your Shopify store (e.g., 'shopify: list my products').",
      sender: 'ai',
      timestamp: new Date(),
      type: 'welcome',
      actions: [
        { text: "Show me my dashboard", action: "show_dashboard"},
        { text: "List my products", action: "show_products"},
        { text: "Any urgent tasks?", action: "show_urgent_tasks"},
        { text: "Ask Shopify: List 3 products", action: "ask_shopify_list_3_products"},
      ]
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedView, setSelectedView] = useState<TraditionalView>('dashboard');
  const [storeData, setStoreData] = useState<StoreData>(mockStoreData);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  
  const [formattedTodaySales, setFormattedTodaySales] = useState<string | null>(null);
  const [formattedConversionRate, setFormattedConversionRate] = useState<string | null>(null);


  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiProductContext, setAiProductContext] = useState<AIProductContext>({});
  const [isAwaitingFeatures, setIsAwaitingFeatures] = useState(false);

  const [shopifyStoreInfo, setShopifyStoreInfo] = useState<ShopInfoState | null>(null);
  const [shopifyError, setShopifyError] = useState<string | null>(null);


  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (storeData?.analytics?.todaySales !== undefined) {
      setFormattedTodaySales(storeData.analytics.todaySales.toLocaleString());
    }
    if (storeData?.analytics?.conversionRate !== undefined) {
        setFormattedConversionRate(storeData.analytics.conversionRate.toLocaleString());
    }
  }, [storeData?.analytics]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const input: SuggestNextStepsInput = {
          storeStatus: `Sales: $${storeData.analytics.todaySales}, Orders: ${storeData.analytics.todayOrders}, Conversion: ${storeData.analytics.conversionRate}%. Top product: ${storeData.analytics.topProduct}. ${storeData.products.filter(p=>p.inventory < 10).length} products low on stock.`,
          recentActivity: "Admin logged in. No major issues reported recently.",
        };
        const result = await suggestNextSteps(input);
        if (result.suggestedSteps) {
          setAiSuggestions(result.suggestedSteps.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch AI suggestions:", error);
      }
    };
    if (storeData?.analytics?.todaySales !== undefined) {
        fetchSuggestions();
    }
  }, [storeData?.analytics]);

  useEffect(() => {
    async function fetchAndSetShopInfo() {
      try {
        setShopifyError(null);
        const info = await getShopInfo();
        if (info) {
          setShopifyStoreInfo(info);
        } else {
          setShopifyError("Could not retrieve Shopify store information. Ensure .env variables are correct and client initialized.");
        }
      } catch (error: any) {
        console.error("Error fetching Shopify store info in component:", error);
        setShopifyError(`Failed to connect to Shopify: ${error.message || 'Unknown error'}. Check .env, API access, and connectivity.`);
        setShopifyStoreInfo(null);
      }
    }
    fetchAndSetShopInfo();
  }, []);


  const handleAddProductFromAIContext = () => {
    if (!aiProductContext.productName) {
      toast({ title: "Missing Product Name", description: "Cannot add product without a name.", variant: "destructive" });
      return;
    }

    const newProductId = Math.max(0, ...storeData.products.map(p => p.id)) + 1;
    const newProduct: Product = {
      id: newProductId,
      name: aiProductContext.productName,
      price: 19.99, // Default price
      inventory: 10, // Default inventory
      status: "active",
      sales: 0,
      image: aiProductContext.imageDataUrl || "https://placehold.co/100x100.png?text=📦", // Placeholder image
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      category: aiProductContext.category || "Uncategorized",
      description: `${aiProductContext.tags ? `Tags: ${aiProductContext.tags.join(', ')}\n\n` : ''}${aiProductContext.fullDescription || aiProductContext.initialDescription || 'No description yet.'}`,
    };

    setStoreData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    
    const confirmationMessage: AIMessage = {
      id: messages.length + Date.now(), 
      sender: 'ai',
      timestamp: new Date(),
      type: 'product_added_confirmation',
      text: `Great! "${newProduct.name}" has been added to your store with basic details. You can view it in the Products section or ask me to edit it.`,
      data: newProduct,
      actions: [
        { text: "View Products", action: "show_products" },
        { text: `Edit ${newProduct.name}`, action: `edit_product_${newProduct.id}` }
      ]
    };
    setMessages(prev => [...prev, confirmationMessage]);
    setAiProductContext({}); 
    toast({ title: "Product Added!", description: `${newProduct.name} is now in your catalog.` });
  };

  const processShopifyQuery = async (queryText: string): Promise<Partial<AIMessage>> => {
    setIsTyping(true);
    try {
      const agentInput: ShopifyAgentInput = { query: queryText };
      const agentResult = await queryShopifyAgent(agentInput);
      setIsTyping(false);

      // Attempt to parse product data if present in the response for card display
      // This is a simple heuristic; a more robust solution would involve structured data from the agent.
      let productDataForCard: ServiceShopifyProduct | null = null;
      if (agentResult.response.includes("Product ID:") && agentResult.response.includes("Name:")) {
        // Basic check for product details in the response
        // This part would need to be more robust if we want to reliably extract structured data
        // For now, we'll just pass the text response.
      }


      return {
        type: 'shopify_agent_response',
        text: agentResult.response,
        data: agentResult.isError ? { error: agentResult.errorMessage } : { productDataForCard }, // Pass data for potential card rendering
      };
    } catch (error: any) {
      console.error("Error processing Shopify query with agent:", error);
      setIsTyping(false);
      return { type: 'error', text: `Sorry, I couldn't process your Shopify request: ${error.message || "Unknown error"}` };
    }
  };


  const processCommand = async (input: string, currentMessages: AIMessage[], currentAiProductContext: AIProductContext): Promise<Partial<AIMessage>> => {
    const command = input.toLowerCase().trim();
    const lastAiMessage = currentMessages.filter(m => m.sender === 'ai').pop();

    if (command.startsWith("shopify:")) {
      const shopifyQueryText = command.substring("shopify:".length).trim();
      if (!shopifyQueryText) {
        return { type: 'help', text: "Please provide a query after 'shopify:'. For example, 'shopify: list my products'." };
      }
      return processShopifyQuery(shopifyQueryText);
    }

    if (lastAiMessage?.type === 'image_analysis_result' && currentAiProductContext.imageDataUrl) {
        setAiProductContext(prev => ({...prev, productName: input}));
        return {
            type: 'confirm_product_name',
            text: `OK, product name set to "${input}". Based on the image, I found:
Category: ${currentAiProductContext.category || 'N/A'}
Tags: ${(currentAiProductContext.tags || []).join(', ')}
Initial Description: "${currentAiProductContext.initialDescription || 'N/A'}"

What's next?`,
            actions: [
                { text: `Add "${input}" to Store`, action: "add_product_from_context", variant: "default" },
                { text: `Generate Full Description`, action: "request_features_for_description_context" },
            ]
        };
    }

    if (isAwaitingFeatures && currentAiProductContext.productName) {
        setIsAwaitingFeatures(false);
        try {
            setIsTyping(true);
            const genInput: GenerateProductDescriptionInput = {
                productName: currentAiProductContext.productName,
                keyFeatures: input, 
                tone: "engaging", 
                targetKeywords: input.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0),
                existingDescription: currentAiProductContext.initialDescription
            };
            const descriptionResult = await generateProductDescription(genInput);
            setIsTyping(false);
            setAiProductContext(prev => ({...prev, fullDescription: descriptionResult.description}));
            return {
                type: 'product_description_result',
                text: `Generated full description for "${currentAiProductContext.productName}":\n\n${descriptionResult.description}\n\nReady to add it to the store?`,
                data: { productName: currentAiProductContext.productName, description: descriptionResult.description, context: currentAiProductContext },
                actions: [
                     { text: `Add "${currentAiProductContext.productName}" to Store`, action: "add_product_from_context", variant: "default" },
                     { text: "Regenerate (new features?)", action: "request_features_for_description_context" }
                ]
            };
        } catch (error) {
            console.error("Error generating product description from context:", error);
            setIsTyping(false);
            setIsAwaitingFeatures(false);
            return { type: 'error', text: "Sorry, I couldn't generate the description. Please try again or add manually." };
        }
    }
    
    if (command.includes('dashboard') || command.includes('overview') || command.includes('stats')) {
      return {
        type: 'analytics_dashboard',
        text: "Here's your current performance overview:",
        data: storeData.analytics,
        actions: [
          { text: "View Detailed Report", action: "view_detailed_report", variant: "outline" },
          { text: "Refresh Data", action: "refresh_analytics_data", variant: "outline" },
        ]
      };
    }

    if (command.includes('product') && (command.includes('list') || command.includes('show') || command.includes('all'))) {
      return {
        type: 'product_list',
        text: "Here's your (mock) product catalog:", // Clarify it's mock data
        data: storeData.products,
        actions: [
          { text: "Add New Product (Manual)", action: "add_product_interactive", variant: "outline" },
          { text: "Upload Image to Add", action: "trigger_image_upload_for_product", variant: "default"},
          { text: "Ask Shopify: List products", action: "ask_shopify_list_products", variant: "secondary"}
        ]
      };
    }
    
    if (((command.includes('add') || command.includes('create')) && command.includes('product')) || command === 'manual_product_form') {
      return {
        type: 'add_product_form',
        text: "Let's add a new product. Please provide the product name, key features (comma separated), and desired tone for the description (e.g., 'SuperWidget;eco-friendly,long-lasting;professional'). You can also upload an image first for AI assistance.",
        actions: [
          { text: "Use AI for Description", action: "ai_product_description_prompt", variant: "default" },
          { text: "Upload Image First", action: "trigger_image_upload_for_product", variant: "outline" },
        ]
      };
    }
    
    const manualDescMatch = input.match(/([\w\s\-\_'\"]+)\s*;\s*([\w\s\-\_,'\"\(\)]+)\s*;\s*([\w\s]+)/);
    if (manualDescMatch && (lastAiMessage?.type === 'add_product_form' || lastAiMessage?.type === 'request_features_for_description')) {
        const [, productName, keyFeatures, tone] = manualDescMatch.map(p => p.trim());
        try {
            setIsTyping(true);
            const descriptionResult = await generateProductDescription({ productName, keyFeatures, tone });
            setIsTyping(false);
            setAiProductContext(prev => ({ ...prev, productName, fullDescription: descriptionResult.description }));
            return {
                type: 'product_description_result',
                text: `Generated description for "${productName}":\n\n${descriptionResult.description}\n\nWhat's next? You can add this product to the store (it will use default price/SKU).`,
                data: { productName, description: descriptionResult.description },
                actions: [
                    { text: `Add "${productName}" to Store`, action: "add_product_from_context" }
                ]
            };
        } catch (error) {
            console.error("Error generating product description (manual):", error);
            setIsTyping(false);
            return { type: 'error', text: "Sorry, I couldn't generate the description. Please try again or add manually." };
        }
    }

    if (command.includes('order') || command.includes('sale')) {
      return {
        type: 'orders_list',
        text: "Here are your recent (mock) orders:", // Clarify mock
        data: storeData.orders,
        actions: [
          { text: "Filter Orders", action: "filter_orders", variant: "outline" },
          { text: "Process Pending", action: "process_pending_orders", variant: "default" },
          { text: "Ask Shopify: List orders", action: "ask_shopify_list_orders", variant: "secondary" }
        ]
      };
    }

    if (command.includes('urgent') || command.includes('task')) {
      const lowStockProducts = storeData.products.filter(p => p.inventory < 10 && p.status === 'active');
      const pendingOrders = storeData.orders.filter(o => o.status === 'pending' || o.status === 'processing');
      let responseText = "Here are some items needing attention (from mock data):\n";
      if (lowStockProducts.length > 0) {
        responseText += `\n- ${lowStockProducts.length} product(s) are low on stock (e.g., ${lowStockProducts[0].name}).`;
      }
      if (pendingOrders.length > 0) {
        responseText += `\n- You have ${pendingOrders.length} order(s) to process (e.g., Order ${pendingOrders[0].id}).`;
      }
      if (lowStockProducts.length === 0 && pendingOrders.length === 0) {
        responseText = "Things look good! No immediate urgent tasks found in mock data.";
      }
      return {
        text: responseText,
        actions: [
          { text: "View Low Stock", action: "view_low_stock", variant: "outline" },
          { text: "View Pending Orders", action: "view_pending_orders", variant: "outline" },
        ]
      };
    }
    
    return {
      type: 'help',
      text: "I'm not sure how to help with that. You can ask me to:\n\n• Show dashboard/overview/stats\n• List/show products (mock data)\n• Add/create product (you can upload an image too!)\n• Show orders/sales (mock data)\n• Check urgent tasks (mock data)\n• Query Shopify: 'shopify: [your question]'\n\nHow can I assist you?",
       actions: [
        { text: "Show Dashboard", action: "show_dashboard"},
        { text: "List Mock Products", action: "show_products"},
        { text: "Ask Shopify: List products", action: "ask_shopify_list_products"},
      ]
    };
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !imageDataUrl) return;
    
    const userMessageText = inputValue.trim();
    const currentImageDataUrl = imageDataUrl; 

    const userMessage: AIMessage = {
      id: messages.length + Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
      type: currentImageDataUrl ? 'user_image_upload' : undefined,
      data: currentImageDataUrl ? { imageDataUrl: currentImageDataUrl, text: userMessageText } : {text: userMessageText}
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setImageDataUrl(null); 
    setSelectedImageFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 300)); 

    let aiResponseMessage: AIMessage | null = null;

    if (currentImageDataUrl) {
      try {
        const analysisResult = await analyzeProductImage({ imageDataUri: currentImageDataUrl });
        setAiProductContext({
            imageDataUrl: currentImageDataUrl,
            category: analysisResult.category,
            tags: analysisResult.tags,
            initialDescription: analysisResult.initialDescription,
        });
        aiResponseMessage = {
          id: updatedMessages.length + Date.now() +1, 
          sender: 'ai',
          timestamp: new Date(),
          type: 'image_analysis_result',
          text: `I've analyzed the image! Here's what I found:
Category: ${analysisResult.category}
Tags: ${analysisResult.tags.join(', ')}
Initial description idea: "${analysisResult.initialDescription}"

What is the product name for this item?`,
          data: { ...analysisResult, originalImage: currentImageDataUrl },
        };
        setMessages(prev => [...prev, aiResponseMessage!]);
        
      } catch (error) {
        console.error("Error analyzing product image:", error);
        aiResponseMessage = {
          id: updatedMessages.length + Date.now() + 1,
          sender: 'ai',
          timestamp: new Date(),
          type: 'error',
          text: "Sorry, I couldn't analyze the image. Please try again."
        };
        setMessages(prev => [...prev, aiResponseMessage!]);
      }
    } else if (userMessageText) {
      const responsePart = await processCommand(userMessageText, updatedMessages, aiProductContext);
      aiResponseMessage = {
        id: updatedMessages.length + Date.now() + 1,
        sender: 'ai',
        timestamp: new Date(),
        ...responsePart
      };
      setMessages(prev => [...prev, aiResponseMessage!]);
    }
    
    setIsTyping(false);
  };

  const handleQuickAction = (action: string) => {
    if (action === "add_product_from_context") {
        handleAddProductFromAIContext();
        return;
    }
    if (action === "request_features_for_description_context") {
        setIsAwaitingFeatures(true);
        const requestMessage: AIMessage = {
            id: messages.length + Date.now(),
            sender: 'ai',
            timestamp: new Date(),
            type: 'request_features_for_description',
            text: `Sure! To generate a full description for "${aiProductContext.productName}", please provide some key features or keywords (comma-separated). You can also mention the tone if you have a preference.`,
        };
        setMessages(prev => [...prev, requestMessage]);
        return;
    }
    if (action === "trigger_image_upload_for_product") {
        fileInputRef.current?.click();
        return;
    }
    // Handle new Shopify quick actions
    if (action === "ask_shopify_list_products") {
        setInputValue("shopify: list products");
        setTimeout(() => document.getElementById('send-chat-message-button')?.click(), 0);
        return;
    }
    if (action === "ask_shopify_list_3_products") {
        setInputValue("shopify: list 3 products");
        setTimeout(() => document.getElementById('send-chat-message-button')?.click(), 0);
        return;
    }
     if (action === "ask_shopify_list_orders") {
        setInputValue("shopify: list orders"); // Example, tool not yet implemented
        toast({ title: "Shopify Orders", description: "Order tools are not yet implemented.", variant: "default" });
        // setTimeout(() => document.getElementById('send-chat-message-button')?.click(), 0);
        return;
    }


    if (mode === 'conversational') {
      let actionText = '';
      if (action.startsWith("show_") || action.startsWith("view_") || action.startsWith("add_") || action.startsWith("filter_") || action.startsWith("process_") || action.startsWith("edit_product_")) {
        actionText = action.replace(/_/g, ' ');
         if (action.startsWith("edit_product_")) {
            toast({ title: "Edit Product", description: `Navigating to edit ${actionText.substring(13)} (mock action)`});
            setInputValue(`Show product ${actionText.substring(13)} details`); 
         }
      } else {
         switch (action) {
          case 'dashboard': actionText = 'Show dashboard'; break;
          case 'products': actionText = 'List products'; break;
          case 'orders': actionText = 'Show orders'; break;
          case 'ai_product_description_prompt': 
            setInputValue(''); 
            const promptMessage: AIMessage = {
                id: messages.length + Date.now(),
                text: "Okay, let's use AI. Provide product name, key features (comma-separated), and tone. Format: 'ProductName; feature1, feature2; tone'",
                sender: 'ai',
                timestamp: new Date(),
                type: 'add_product_form' 
            };
            setMessages(prev => [...prev, promptMessage]);
            return;
          default: actionText = action; 
        }
      }
      setInputValue(actionText);
      setTimeout(() => {
        const sendButton = document.getElementById('send-chat-message-button');
        if (sendButton) {
            sendButton.click();
        } else {
            console.warn("Send button not found for quick action.");
        }
      }, 0);
    } else {
      setSelectedView(action as TraditionalView);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const ProductCardChat = ({ product, isShopifyProduct = false }: { product: Product | ServiceShopifyProduct, isShopifyProduct?: boolean }) => (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl overflow-hidden">
              {isShopifyProduct ? (
                (product as ServiceShopifyProduct).imageUrl ? 
                  <Image src={(product as ServiceShopifyProduct).imageUrl!} alt={(product as ServiceShopifyProduct).title} width={48} height={48} className="rounded-lg object-cover" data-ai-hint="product image" /> :
                  <Package className="w-6 h-6 text-muted-foreground" />
              ) : (
                (product as Product).image.startsWith('http') || (product as Product).image.startsWith('data:') ? 
                  <Image src={(product as Product).image} alt={(product as Product).name} width={48} height={48} className="rounded-lg object-cover" data-ai-hint="product image"/> : 
                  <span className="text-2xl">{(product as Product).image}</span>
              )}
            </div>
            <div>
              <CardTitle className="text-base">{isShopifyProduct ? (product as ServiceShopifyProduct).title : (product as Product).name}</CardTitle>
              <CardDescription className="text-xs">
                {isShopifyProduct ? `ID: ${(product as ServiceShopifyProduct).id.split('/').pop()}` : `SKU: ${(product as Product).sku}`} | Category: {isShopifyProduct ? (product as ServiceShopifyProduct).vendor || 'N/A' : (product as Product).category}
              </CardDescription>
            </div>
          </div>
          <Badge variant={product.status.toLowerCase() === 'active' ? 'secondary' : product.status.toLowerCase() === 'out_of_stock' ? 'destructive': 'outline'}>
            {product.status.toLowerCase() === 'active' ? 'Active' : product.status.toLowerCase() === 'out_of_stock' ? 'Out of Stock' : product.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 text-sm">
        <div className="flex justify-between">
          <span>Price: <span className="font-semibold">{isShopifyProduct ? ((product as ServiceShopifyProduct).priceRange ? `${(product as ServiceShopifyProduct).priceRange?.minVariantPrice.amount} ${(product as ServiceShopifyProduct).priceRange?.minVariantPrice.currencyCode}`: 'N/A') : `$${(product as Product).price.toFixed(2)}`}</span></span>
          <span>Inventory: <span className={`font-semibold ${((product as Product).inventory < 10 && !isShopifyProduct) || ((product as ServiceShopifyProduct).totalInventory !== null && (product as ServiceShopifyProduct).totalInventory! < 10 && isShopifyProduct) ? 'text-destructive' : ''}`}>{isShopifyProduct ? (product as ServiceShopifyProduct).totalInventory ?? 'N/A' : (product as Product).inventory} units</span></span>
        </div>
        {(product as Product).description && !isShopifyProduct && <p className="mt-2 text-muted-foreground text-xs line-clamp-2 whitespace-pre-wrap">{(product as Product).description}</p>}
        {(product as ServiceShopifyProduct).descriptionHtml && isShopifyProduct && <p className="mt-2 text-muted-foreground text-xs line-clamp-2" dangerouslySetInnerHTML={{ __html: (product as ServiceShopifyProduct).descriptionHtml!.substring(0,150) + '...' }} />}
      </CardContent>
      <CardFooter className="p-4 flex gap-2">
         {isShopifyProduct && (product as ServiceShopifyProduct).onlineStoreUrl && (
            <Button size="sm" variant="outline" onClick={() => window.open((product as ServiceShopifyProduct).onlineStoreUrl!, '_blank')}>
                <LinkIcon className="w-3 h-3 mr-1.5" /> View on Shopify
            </Button>
         )}
         <Button size="sm" variant={isShopifyProduct ? "secondary" : "outline"} onClick={() => toast({ title: `Product Action`, description: `Action for ${isShopifyProduct ? (product as ServiceShopifyProduct).title : (product as Product).name}`})}>
            {isShopifyProduct ? 'Shopify Actions' : 'Edit'}
         </Button>
      </CardFooter>
    </Card>
  );

  const OrderCardChat = ({ order }: { order: Order }) => (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Order {order.id}</CardTitle>
          <Badge variant={
            order.status === 'fulfilled' ? 'secondary' : 
            order.status === 'pending' ? 'default' : 
            order.status === 'processing' ? 'outline' : 'destructive'
          }>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <CardDescription className="text-xs">Customer: {order.customer} | Date: {new Date(order.date).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 text-sm">
        <div className="flex justify-between">
          <span>Total: <span className="font-semibold">${order.total.toFixed(2)}</span></span>
          <span>Items: {order.items.join(', ').substring(0,30)}...</span>
        </div>
      </CardContent>
       <CardFooter className="p-4">
         <Button size="sm" variant="outline" onClick={() => toast({ title: "View Order", description: `Viewing order ${order.id}`})}>View Details</Button>
      </CardFooter>
    </Card>
  );

  const AnalyticsCardChat = ({ analytics }: { analytics: AnalyticsData }) => {
    const [localFormattedSales, setLocalFormattedSales] = useState<string | null>(null);
    const [localFormattedConversion, setLocalFormattedConversion] = useState<string | null>(null);

    useEffect(() => {
      if (analytics?.todaySales !== undefined) {
        setLocalFormattedSales(analytics.todaySales.toLocaleString());
      }
      if (analytics?.conversionRate !== undefined) {
        setLocalFormattedConversion(analytics.conversionRate.toLocaleString());
      }
    }, [analytics]);
    
    return (
      <Card className="mb-3 shadow-sm">
        <CardHeader className="p-4">
          <CardTitle className="text-base">Today's Performance (Mock Data)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-sm grid grid-cols-2 gap-2">
          <div>Sales: <span className="font-semibold">{localFormattedSales !== null ? `$${localFormattedSales}` : 'Loading...'}</span></div>
          <div>Orders: <span className="font-semibold">{analytics?.todayOrders ?? 'N/A'}</span></div>
          <div>Conversion: <span className="font-semibold">{localFormattedConversion !== null ? `${localFormattedConversion}%` : 'Loading...'}</span></div>
          <div>Top Product: <span className="font-semibold">{analytics?.topProduct ?? 'N/A'}</span></div>
        </CardContent>
      </Card>
    );
  };
  
  const MessageBubble = ({ message }: { message: AIMessage }) => {
    const isAI = message.sender === 'ai';
    const [formattedTimestamp, setFormattedTimestamp] = useState<string | null>(null);

    useEffect(() => {
      if (message.timestamp) {
        setFormattedTimestamp(message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, [message.timestamp]);

    return (
      <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`flex gap-2 max-w-xl ${isAI ? '' : 'flex-row-reverse'}`}>
          {isAI ? <BotMessageSquare className="text-primary w-8 h-8 shrink-0 mt-1" /> : <User className="text-accent w-8 h-8 shrink-0 mt-1" />}
          <div className={`px-4 py-3 rounded-lg shadow-md ${
            isAI ? 'bg-card text-card-foreground border' : 'bg-primary text-primary-foreground'
          }`}>
            {message.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>}
            
            {message.type === 'user_image_upload' && message.data?.imageDataUrl && (
              <div className="mt-2">
                <Image src={message.data.imageDataUrl} alt="Uploaded preview" width={200} height={200} className="rounded-lg object-contain max-h-48" data-ai-hint="uploaded product" />
              </div>
            )}

            {message.type === 'image_analysis_result' && message.data?.originalImage && (
                 <div className="mt-2">
                    <Image src={message.data.originalImage} alt="Analyzed image" width={150} height={150} className="rounded-lg object-contain max-h-36 mb-2" data-ai-hint="analyzed product" />
                </div>
            )}
            
            {message.type === 'product_added_confirmation' && message.data && (
                <div className="mt-3">
                    <ProductCardChat product={message.data as Product} />
                </div>
            )}

            {message.type === 'shopify_agent_response' && message.data?.productDataForCard && (
                 <div className="mt-3">
                    <ProductCardChat product={message.data.productDataForCard as ServiceShopifyProduct} isShopifyProduct={true} />
                </div>
            )}

            {message.type === 'product_list' && message.data && (
              <div className="mt-3 max-h-96 overflow-y-auto pr-2 space-y-2">
                {(message.data as Product[]).map(product => (
                  <ProductCardChat key={product.id} product={product} />
                ))}
              </div>
            )}

            {message.type === 'orders_list' && message.data && (
              <div className="mt-3 max-h-96 overflow-y-auto pr-2 space-y-2">
                {(message.data as Order[]).map(order => (
                  <OrderCardChat key={order.id} order={order} />
                ))}
              </div>
            )}

            {message.type === 'analytics_dashboard' && message.data && (
              <div className="mt-3">
                <AnalyticsCardChat analytics={message.data as AnalyticsData} />
              </div>
            )}
            
            {message.actions && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.actions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant || (isAI ? "outline" : "secondary")}
                    onClick={() => handleQuickAction(action.action)}
                    className={isAI ? "bg-background hover:bg-muted" : ""}
                  >
                    {action.text}
                  </Button>
                ))}
              </div>
            )}
            
            {formattedTimestamp !== null ? (
              <div className={`text-xs mt-2 ${isAI ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                {formattedTimestamp}
              </div>
            ) : <div className={`text-xs mt-2 ${isAI ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>Loading time...</div>}
          </div>
        </div>
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
      <div className="flex gap-2">
        <BotMessageSquare className="text-primary w-8 h-8 shrink-0 mt-1" />
        <div className="bg-card text-card-foreground border px-4 py-3 rounded-lg shadow-md">
          <div className="flex space-x-1 items-center h-5">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
          </div>
        </div>
      </div>
    </div>
  );

  const TraditionalProductsView = () => (
    <Card className="h-full shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Product Catalog (Mock Data)</CardTitle>
            <CardDescription>Manage your product inventory and listings. For Shopify products, use the chat.</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
            <Button onClick={() => {
                setMode('conversational');
                handleQuickAction('trigger_image_upload_for_product');
            }}><Plus className="w-4 h-4 mr-2" />Add Product (AI)</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Inventory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeData.products.map(product => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-2xl overflow-hidden">
                   {product.image.startsWith('http') || product.image.startsWith('data:') ? 
                      <Image src={product.image} alt={product.name} width={48} height={48} className="rounded-md object-cover" data-ai-hint="product thumbnail"/> : 
                      <span className="text-2xl">{product.image}</span>
                    }
                  </div>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                <TableCell className={`text-right ${product.inventory < 10 ? 'text-destructive font-semibold' : ''}`}>{product.inventory}</TableCell>
                <TableCell>
                  <Badge variant={product.status === 'active' ? 'secondary' : product.status === 'out_of_stock' ? 'destructive' : 'outline'}>
                    {product.status === 'active' ? 'Active' : product.status === 'out_of_stock' ? 'Out of Stock' : 'Archived'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="mr-1"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="mr-1"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );

  const TraditionalOrdersView = () => (
     <Card className="h-full shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Order Management (Mock Data)</CardTitle>
            <CardDescription>Track and process customer orders. For Shopify orders, use the chat.</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button><CheckCircle className="w-4 h-4 mr-2" />Process All Pending</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeData.orders.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={
                    order.status === 'fulfilled' ? 'secondary' : 
                    order.status === 'pending' ? 'default' : 
                    order.status === 'processing' ? 'outline' : 'destructive'
                  }>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="mr-1"><Eye className="w-4 h-4" /></Button>
                  {order.status === 'pending' && <Button variant="ghost" size="icon"><CheckCircle className="w-4 h-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );

  const TraditionalDashboard = () => {
    const [localFormattedSales, setLocalFormattedSales] = useState<string | null>(null);
    const [localFormattedConversion, setLocalFormattedConversion] = useState<string | null>(null);

    useEffect(() => {
      if (storeData?.analytics?.todaySales !== undefined) {
        setLocalFormattedSales(storeData.analytics.todaySales.toLocaleString());
      }
      if (storeData?.analytics?.conversionRate !== undefined) {
        setLocalFormattedConversion(storeData.analytics.conversionRate.toLocaleString());
      }
    }, [storeData.analytics]);

    return (
      <div className="space-y-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle>Shopify Store Status</CardTitle>
            </div>
            <CardDescription>Connection details for your linked Shopify store.</CardDescription>
          </CardHeader>
          <CardContent>
            {shopifyStoreInfo && (
              <div className="space-y-2 text-sm">
                <p><strong>Store Name:</strong> {shopifyStoreInfo.name}</p>
                <p><strong>Store Email:</strong> {shopifyStoreInfo.email}</p>
                <p className="text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-2"/>Successfully connected to Shopify.</p>
              </div>
            )}
            {shopifyError && (
              <div className="space-y-2 text-sm">
                <p className="text-destructive flex items-center"><AlertCircle className="w-4 h-4 mr-2"/><strong>Connection Error:</strong> {shopifyError}</p>
                <p className="text-muted-foreground">Please ensure your `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN` are correctly set in the `.env` file and your app has the necessary permissions.</p>
              </div>
            )}
            {!shopifyStoreInfo && !shopifyError && (
              <p className="text-sm text-muted-foreground">Attempting to connect to Shopify...</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue (Mock)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{localFormattedSales !== null ? `$${localFormattedSales}`: 'Loading...'}</div>
              <p className="text-xs text-muted-foreground">+12.5% from yesterday</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Today (Mock)</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{storeData.analytics.todayOrders}</div>
              <p className="text-xs text-muted-foreground">2 pending fulfillment</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate (Mock)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{localFormattedConversion !== null ? `${localFormattedConversion}%` : 'Loading...'}</div>
              <p className="text-xs text-muted-foreground">+0.3% from last week</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products (Mock)</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{storeData.products.filter(p => p.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">{storeData.products.filter(p => p.status === 'out_of_stock').length} out of stock</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle>Recent Orders (Mock)</CardTitle>
              <CardDescription>A quick glance at the latest orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {storeData.orders.slice(0, 3).map(order => (
                <div key={order.id} className="mb-4 grid grid-cols-[25px_1fr_auto] items-start pb-4 last:mb-0 last:pb-0">
                  <span className={`flex h-2 w-2 translate-y-1 rounded-full bg-${order.status === 'fulfilled' ? 'green' : order.status === 'pending' ? 'yellow' : 'red'}-500`} />
                  <div className="space-y-1 ml-2">
                    <p className="text-sm font-medium leading-none">{order.id} - {order.customer}</p>
                    <p className="text-sm text-muted-foreground">{order.items.join(', ')}</p>
                  </div>
                  <div className="ml-auto font-medium">${order.total.toFixed(2)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle>Inventory Status (Mock)</CardTitle>
              <CardDescription>Products nearing low stock levels.</CardDescription>
            </CardHeader>
            <CardContent>
              {storeData.products.filter(p => p.inventory < 20 && p.status === 'active').slice(0,3).map(product => (
                <div key={product.id} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{product.name}</span>
                    <span className={`${product.inventory < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>{product.inventory} units</span>
                  </div>
                  <Progress value={(product.inventory / 50) * 100} className="h-2" />
                </div>
              ))}
              {storeData.products.filter(p => p.inventory < 20 && p.status === 'active').length === 0 && (
                <p className="text-sm text-muted-foreground">All products have sufficient stock.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTraditionalContent = () => {
    switch (selectedView) {
      case 'products': return <TraditionalProductsView />;
      case 'orders': return <TraditionalOrdersView />;
      case 'dashboard':
      default: return <TraditionalDashboard />;
    }
  };

 return (
    <div className="flex h-screen bg-background text-foreground font-body">
      <div className="w-20 bg-card border-r border-border flex flex-col items-center py-5 space-y-3 shadow-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMode(mode === 'conversational' ? 'traditional' : 'conversational')}
          className={`p-3 rounded-lg transition-all duration-300 h-12 w-12 mb-4 ${
            mode === 'conversational' 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title={`Switch to ${mode === 'conversational' ? 'Traditional' : 'Conversational'} Mode`}
        >
          {mode === 'conversational' ? <MessageCircle className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
        </Button>
        
        {quickActionsConfig.map(action => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              variant={selectedView === action.action && mode === 'traditional' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => handleQuickAction(action.action)}
              className="p-3 rounded-lg transition-all duration-200 h-10 w-10 text-muted-foreground hover:text-foreground data-[state=active]:text-primary"
              title={action.text}
              data-state={selectedView === action.action && mode === 'traditional' ? 'active' : 'inactive'}
            >
              <IconComponent className="w-5 h-5" />
            </Button>
          );
        })}
        
        <div className="mt-auto">
        <Button variant="ghost" size="icon" className="p-3 rounded-lg text-muted-foreground hover:text-foreground h-10 w-10">
          <Settings className="w-5 h-5" />
        </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mode === 'traditional' && selectedView !== 'dashboard' && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedView('dashboard')} className="mr-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="p-2 bg-primary/10 rounded-lg">
                 { mode === 'conversational' ? <BrainCircuit className="w-6 h-6 text-primary" /> : <Sparkles className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {mode === 'conversational' ? 'AI Commerce Assistant' : 
                    (selectedView.charAt(0).toUpperCase() + selectedView.slice(1))}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {mode === 'conversational' 
                    ? 'Intelligent store management through conversation'
                    : `Manage your ${selectedView}`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${mode === 'conversational' ? 'bg-primary animate-pulse' : (shopifyStoreInfo ? 'bg-green-500' : shopifyError ? 'bg-red-500' : 'bg-yellow-500')}`}></div>
                <span>{mode === 'conversational' ? 'AI Active' : (shopifyStoreInfo ? 'Shopify Connected' : shopifyError ? 'Shopify Connection Error' : 'Shopify Connecting...')}</span>
              </div>
              <Input type="search" placeholder="Search everything..." className="w-64 h-9 rounded-full text-xs bg-muted border-none focus-visible:ring-primary" />
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Bell className="w-5 h-5" /></Button>
              <User className="w-8 h-8 text-muted-foreground p-1.5 bg-muted rounded-full" />
            </div>
          </div>
        </div>

        {mode === 'conversational' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-y-auto p-6">
              <div className="flex-1 space-y-4">
                {messages.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            
              <div className="bg-card border-t border-border p-4 sticky bottom-0">
                 {imageDataUrl && (
                  <div className="mb-2 p-2 border rounded-lg bg-muted relative max-w-xs">
                    <Image src={imageDataUrl} alt="Selected preview" width={80} height={80} className="rounded object-contain" data-ai-hint="selected image preview" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-1 right-1 h-6 w-6 bg-background/50 hover:bg-background/80"
                      onClick={() => {
                        setImageDataUrl(null); 
                        setSelectedImageFile(null);
                        if(fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-end space-x-3">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-[40px] w-[40px] p-0 shrink-0" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Image"
                  >
                    <ImageUp className="w-4 h-4" />
                  </Button>
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={imageDataUrl ? "Add details for the image or send as is..." : isAwaitingFeatures ? `Enter features/keywords for "${aiProductContext.productName}"...` : "Ask about products, orders, or type 'shopify: [your query]'..."}
                    className="flex-1 p-3 border-border rounded-lg focus:ring-1 focus:ring-primary resize-none shadow-sm text-sm min-h-[40px]"
                    rows={1}
                  />
                  <Button
                    id="send-chat-message-button"
                    onClick={handleSendMessage}
                    disabled={(!inputValue.trim() && !imageDataUrl) || isTyping}
                    className="h-[40px] w-[40px] p-0"
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Show dashboard', 'List products', 'shopify: list 2 products'].map(suggestion => (
                    <Button
                      key={suggestion}
                      size="sm"
                      variant="outline"
                      onClick={() => {setInputValue(suggestion); setTimeout(()=>document.getElementById('send-chat-message-button')?.click(),0);}}
                      className="text-xs h-7"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="w-80 bg-card border-l border-border p-6 overflow-y-auto hidden lg:block">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">Performance Hub</h2>
                <p className="text-xs text-muted-foreground">Real-time business insights</p>
              </div>
              
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium">Revenue Today (Mock)</CardTitle>
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <div className="text-xl font-bold">
                      {formattedTodaySales !== null ? `$${formattedTodaySales}` : 'Loading...'}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium">Pending Orders (Mock)</CardTitle>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <div className="text-xl font-bold">{storeData.orders.filter(o => o.status === 'pending' || o.status === 'processing').length}</div>
                  </CardContent>
                </Card>
                 <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium">Low Stock Items (Mock)</CardTitle>
                    <Package className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <div className="text-xl font-bold">{storeData.products.filter(p => p.inventory < 10 && p.status === 'active').length}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">AI Recommendations</h3>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => {setInputValue(suggestion.step); setTimeout(()=>document.getElementById('send-chat-message-button')?.click(),0);}}
                      className="w-full text-left justify-start h-auto py-2 px-3 text-xs leading-tight"
                    >
                      <Sparkles className="w-3 h-3 mr-2 text-primary shrink-0" /> {suggestion.step}
                    </Button>
                  ))}
                   {aiSuggestions.length === 0 && <p className="text-xs text-muted-foreground">No specific recommendations right now.</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-muted/40">
            {renderTraditionalContent()}
          </div>
        )}
      </div>
    </div>
  );
}

