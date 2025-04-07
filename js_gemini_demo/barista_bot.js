import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import readline from 'readline';

// Initialize the Gemini client
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODEL_ID = "gemini-2.0-flash";

// Order management
let order = [];  // The in-progress order
let placedOrder = [];  // The confirmed, completed order

function addToOrder(drink, modifiers = []) {
    /** Adds the specified drink to the customer's order, including any modifiers */
    order.push([drink, modifiers]);
}

function getOrder() {
    /** Returns the customer's order */
    return order;
}

function removeItem(n) {
    /** Removes the nth (one-based) item from the order */
    const [item] = order.splice(n - 1, 1);
    return item;
}

function clearOrder() {
    /** Removes all items from the customer's order */
    order = [];
}

async function confirmOrder() {
    /** Asks the customer if the order is correct */
    console.log("Your order:");
    if (order.length === 0) {
        console.log("  (no items)");
    }

    for (const [drink, modifiers] of order) {
        console.log(`  ${drink}`);
        if (modifiers.length > 0) {
            console.log(`   - ${modifiers.join(", ")}`);
        }
    }

    return new Promise((resolve) => {
        rl.question("Is this correct? ", (answer) => {
            resolve(answer);
        });
    });
}

function placeOrder() {
    /** Submit the order to the kitchen */
    placedOrder = [...order];
    clearOrder();
    return Math.floor(Math.random() * 10) + 1; // Random wait time 1-10 mins
}

// Coffee bot prompt
const COFFEE_BOT_PROMPT = `You are a coffee order taking system and you are restricted to talk only about drinks on the MENU. Do not talk about anything but ordering MENU drinks for the customer, ever.
Your goal is to do place_order after understanding the menu items and any modifiers the customer wants.
Add items to the customer's order with add_to_order, remove specific items with remove_item, and reset the order with clear_order.
To see the contents of the order so far, call get_order (by default this is shown to you, not the user)
Always confirm_order with the user (double-check) before calling place_order. Calling confirm_order will display the order items to the user and returns their response to seeing the list. Their response may contain modifications.
Always verify and respond with drink and modifier names from the MENU before adding them to the order.
If you are unsure a drink or modifier matches those on the MENU, ask a question to clarify or redirect.
You only have the modifiers listed on the menu below: Milk options, espresso shots, caffeine, sweeteners, special requests.
Once the customer has finished ordering items, confirm_order and then place_order.

Hours: Tues, Wed, Thurs, 10am to 2pm
Prices: All drinks are free.

MENU:
Coffee Drinks:
Espresso
Americano
Cold Brew

Coffee Drinks with Milk:
Latte
Cappuccino
Cortado
Macchiato
Mocha
Flat White

Tea Drinks:
English Breakfast Tea
Green Tea
Earl Grey

Tea Drinks with Milk:
Chai Latte
Matcha Latte
London Fog

Other Drinks:
Steamer
Hot Chocolate

Modifiers:
Milk options: Whole, 2%, Oat, Almond, 2% Lactose Free; Default option: whole
Espresso shots: Single, Double, Triple, Quadruple; default: Double
Caffeine: Decaf, Regular; default: Regular
Hot-Iced: Hot, Iced; Default: Hot
Sweeteners (option to add one or more): vanilla sweetener, hazelnut sweetener, caramel sauce, chocolate sauce, sugar free vanilla sweetener
Special requests: any reasonable modification that does not involve items not on the menu, for example: 'extra hot', 'one pump', 'half caff', 'extra foam', etc.

"dirty" means add a shot of espresso to a drink that doesn't usually have it, like "Dirty Chai Latte".
"Regular milk" is the same as 'whole milk'.
"Sweetened" means add some regular sugar, not a sweetener.

Soy milk has run out of stock today, so soy is not available.`;

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function runCoffeeBot() {
    // Initialize chat
    const model = genAI.getGenerativeModel({ 
        model: MODEL_ID,
        systemInstruction: COFFEE_BOT_PROMPT
    });

    const chat = model.startChat({
        tools: [{
            functionDeclarations: [
                {
                    name: "addToOrder",
                    description: "Adds a drink to the order with optional modifiers",
                    parameters: {
                        type: "object",
                        properties: {
                            drink: { type: "string" },
                            modifiers: { 
                                type: "array",
                                items: { type: "string" }
                            }
                        },
                        required: ["drink"]
                    }
                },
                {
                    name: "getOrder",
                    description: "Returns the current order",
                    parameters: { type: "object", properties: {} }
                },
                {
                    name: "removeItem",
                    description: "Removes an item from the order by its position (1-based index)",
                    parameters: {
                        type: "object",
                        properties: {
                            n: { type: "number" }
                        },
                        required: ["n"]
                    }
                },
                {
                    name: "clearOrder",
                    description: "Clears all items from the order",
                    parameters: { type: "object", properties: {} }
                },
                {
                    name: "confirmOrder",
                    description: "Displays the order to the customer and asks for confirmation",
                    parameters: { type: "object", properties: {} }
                },
                {
                    name: "placeOrder",
                    description: "Submits the order and returns estimated wait time",
                    parameters: { type: "object", properties: {} }
                }
            ]
        }]
    });

    console.log("Welcome to Barista bot!\n\n");

    // Main chat loop
    while (placedOrder.length === 0) {
        const userInput = await new Promise((resolve) => {
            rl.question("> ", resolve);
        });

        try {
            const result = await chat.sendMessage(userInput);
            const response = await result.response;
            console.log(response.text());
        } catch (error) {
            console.error("Error:", error);
        }
    }

    console.log("\n\n[barista bot session over]");
    console.log("\nYour order:");
    console.log(`  ${JSON.stringify(placedOrder)}\n`);
    console.log("- Thanks for using Barista Bot!");
    rl.close();
}

// Initialize and run
clearOrder();
addToOrder("Latte", ["Extra shot"]);
addToOrder("Tea");
removeItem(2);
addToOrder("Tea", ["Earl Grey", "hot"]);
confirmOrder().then(() => runCoffeeBot());