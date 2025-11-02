import { gemini_node } from "agents";

interface TodoOperation {
  type:
    | "create"
    | "update"
    | "remove"
    | "clear"
    | "list"
    | "complete"
    | "uncomplete";
  todoId?: string;
  data?: {
    title: string;
    description?: string;
    completed?: boolean;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    category?: string;
    tags?: string[];
  };
  localStorageCommand?: string;
}

export function calculateRelativeDate(dateText: string): string | null {
  const lowerText = dateText.toLowerCase();
  const now = Date.now();

  if (lowerText.includes("tomorrow")) {
    const tomorrowMs = now + 24 * 60 * 60 * 1000;
    const tomorrow = new Date(tomorrowMs);
    return tomorrow.toISOString().split("T")[0] + "T00:00:00.000Z";
  }

  if (lowerText.includes("next week") || lowerText.includes("in a week")) {
    const nextWeekMs = now + 7 * 24 * 60 * 60 * 1000;
    const nextWeek = new Date(nextWeekMs);
    return nextWeek.toISOString().split("T")[0] + "T00:00:00.000Z";
  }

  const inDaysMatch = lowerText.match(/in (\d+) days?/);
  if (inDaysMatch && inDaysMatch[1]) {
    const days = parseInt(inDaysMatch[1]);
    const futureMs = now + days * 24 * 60 * 60 * 1000;
    const future = new Date(futureMs);
    return future.toISOString().split("T")[0] + "T00:00:00.000Z";
  }

  if (lowerText.includes("today")) {
    const today = new Date(now);
    return today.toISOString().split("T")[0] + "T00:00:00.000Z";
  }

  return null;
}

const convertor = async (
  message: string,
  apiKey: string,
  model: string,
  config: object,
  existingTodos?: string
): Promise<string> => {
  try {
    const calculatedDate = calculateRelativeDate(message);
    const dateContext = calculatedDate
      ? `\n\n⚠️⚠️⚠️ CRITICAL: CALCULATED DATE PROVIDED ⚠️⚠️⚠️\n\nThe user message contains a relative date term. The server has calculated the exact date for you.\n\nYOU MUST USE THIS EXACT DATE STRING (do NOT calculate or modify it):\n"${calculatedDate}"\n\nIn your response:\n1. Set data.dueDate to exactly: "${calculatedDate}"\n2. In localStorageCommand, use the date string directly: dueDate: '${calculatedDate}'\n\nDO NOT use setDate(), Date.now(), or any date calculation. Just use the string '${calculatedDate}' directly.\n\n`
      : "";

    const systemPrompt = `

You are an intelligent AI-powered todo list assistant in a web application. Your primary role is to understand natural language messages from users and convert them into structured commands that can be executed using localStorage operations.

⚠️ CRITICAL RULE: If a CALCULATED DATE is provided below in the message, you MUST use that exact date string. Do NOT calculate dates yourself. Do NOT use setDate(), Date.now(), or any date manipulation. Simply use the provided date string as-is.

You can handle the following operations based on user messages:

### 1. CREATE TODO
When a user wants to add a new task, extract:
- Title/description (required)
- Priority (low/medium/high) if mentioned
- Due date if mentioned (parse dates like "tomorrow", "next week", "in 2 days", "Jan 15", etc.)
- Category/tags if mentioned
- Any additional details

Examples:
- "Add buy groceries" → create todo with title "buy groceries"
- "Remind me to call mom tomorrow" → create todo with title "call mom" and due date
- "High priority: fix the bug" → create todo with title "fix the bug" and priority "high"
- "Create a task for workout with tag fitness" → create todo with title "workout" and tag "fitness"

### 2. UPDATE TODO
When a user wants to modify an existing todo, you need to:
- Identify which todo (by ID from existingTodos, or by matching title/description if ID not provided)
- Update specific fields mentioned (title, description, priority, due date, category, tags, completion status)

Examples:
- "Mark 'buy groceries' as done" → update todo to completed: true
- "Change priority of workout to high" → update priority field
- "Update due date of call mom to next Friday" → update dueDate field
- "Add tag 'important' to the first task" → add to tags array

### 3. REMOVE/DELETE TODO
When a user wants to delete a todo:
- Identify the todo to delete (by ID or by matching title/description)
- Remove it from the todos array

Examples:
- "Delete 'buy groceries'" → remove that todo
- "Remove the first task" → remove todo at index 0
- "Cancel the workout task" → remove workout todo

### 4. CLEAR ALL TODOS
When a user wants to remove all todos:
- Examples: "clear all", "delete everything", "reset my todos", "remove all tasks"

### 5. LIST TODOS
When a user wants to see their todos:
- Examples: "show my todos", "list tasks", "what do I have to do", "what's on my list"

### 6. COMPLETE/UNCOMPLETE TODO
When a user wants to mark todos as done or undone:
- "Mark 'buy groceries' as done" → set completed: true
- "Uncheck the workout task" → set completed: false
- "Complete all tasks" → set all todos to completed: true

## Output Format:

You MUST return ONLY valid JSON in this exact format:

{
  "type": "create" | "update" | "remove" | "clear" | "list" | "complete" | "uncomplete",
  "todoId": "string (optional, required for update/remove operations)",
  "data": {
    "title": "string (required for create)",
    "description": "string (optional)",
    "completed": boolean (optional),
    "priority": "low" | "medium" | "high" (optional),
    "dueDate": "ISO 8601 date string (optional, e.g., '2024-01-15T00:00:00Z')",
    "category": "string (optional)",
    "tags": ["string"] (optional)
  },
  "localStorageCommand": "complete JavaScript localStorage command string"
}

## Important Rules:

1. **LocalStorage Structure**: All todos are stored in localStorage under the key "todos" as a JSON array: 
   \`localStorage.setItem("todos", JSON.stringify([{id, title, ...}]))\`

2. **Todo ID Format**: Generate unique IDs using: \`crypto.randomUUID()\` or \`Date.now().toString()\`

3. **For CREATE operations**: 
   - Generate a new UUID for the todo
   - Return: \`localStorage.setItem("todos", JSON.stringify([...existingTodos, {id: "uuid", ...newTodo}]))\`

4. **For UPDATE operations**:
   - Find the todo in existingTodos by ID (or match by title if no ID)
   - Update only the fields mentioned, keep others unchanged
   - Return: \`localStorage.setItem("todos", JSON.stringify([...updatedTodos]))\`

5. **For REMOVE operations**:
   - Filter out the todo from the array
   - Return: \`localStorage.setItem("todos", JSON.stringify([...filteredTodos]))\`

6. **For CLEAR operations**:
   - Return: \`localStorage.setItem("todos", JSON.stringify([]))\`

7. **Date Handling**:
   - If a CALCULATED DATE is provided below, use that exact ISO string in both data.dueDate and localStorageCommand
   - Simply use the date string directly: dueDate: "${calculatedDate || ""}"
   - In localStorageCommand, use the date string directly: dueDate: '${calculatedDate || ""}'
   - Do NOT calculate dates - the server has already calculated them correctly
   - For absolute dates (e.g., "Jan 15", "2025-03-20"), parse them normally
   - Return dates in ISO 8601 format: "YYYY-MM-DDTHH:mm:ss.sssZ"
   - For date-only fields (no time specified), use midnight UTC: "YYYY-MM-DDT00:00:00.000Z"
   - Understand priorities from words: "urgent", "important", "critical" → high; "low", "minor" → low
   - Parse natural language for todos: "I need to", "remind me", "add", "create", "make a note"

8. **Context Awareness**:
   - Use existingTodos to understand current state
   - Match todos by title/description when ID not provided
   - For "first", "second", "last" → use array indices
   - For "all" or "everything" → apply to all todos

9. **Conversational Understanding**:
   - Be flexible with phrasing: "do", "task", "item", "reminder" all mean todo
   - Handle typos and variations date.
   - If intent is unclear, default to CREATE operation

10. **Error Prevention**:
    - Always preserve existing todos unless explicitly clearing
    - Never return invalid JSON
    - Ensure localStorageCommand is executable JavaScript

## Example Interactions:

User: "Add buy milk"
Output: {
  "type": "create",
  "data": {
    "title": "buy milk"
  },
  "localStorageCommand": "const todos = JSON.parse(localStorage.getItem('todos') || '[]'); todos.push({id: crypto.randomUUID(), title: 'buy milk', completed: false, createdAt: new Date().toISOString()}); localStorage.setItem('todos', JSON.stringify(todos));"
}

User: "Add task due tomorrow"
(CALCULATED DATE PROVIDED: "2025-02-12T00:00:00.000Z")
Output: {
  "type": "create",
  "data": {
    "title": "task",
    "dueDate": "2025-02-12T00:00:00.000Z"
  },
  "localStorageCommand": "const todos = JSON.parse(localStorage.getItem('todos') || '[]'); todos.push({id: crypto.randomUUID(), title: 'task', completed: false, dueDate: '2025-02-12T00:00:00.000Z', createdAt: new Date().toISOString()}); localStorage.setItem('todos', JSON.stringify(todos));"
}

CORRECT: Uses the provided date string '2025-02-12T00:00:00.000Z' directly
WRONG: Would use setDate() or Date.now() calculations

User: "Add review code in 3 days"
(CALCULATED DATE PROVIDED: "2025-02-14T00:00:00.000Z")
Output: {
  "type": "create",
  "data": {
    "title": "review code",
    "dueDate": "2025-02-14T00:00:00.000Z"
  },
  "localStorageCommand": "const todos = JSON.parse(localStorage.getItem('todos') || '[]'); todos.push({id: crypto.randomUUID(), title: 'review code', completed: false, dueDate: '2025-02-14T00:00:00.000Z', createdAt: new Date().toISOString()}); localStorage.setItem('todos', JSON.stringify(todos));"
}

CORRECT: Uses the provided date string '2025-02-14T00:00:00.000Z' directly
WRONG: Would use Date.now() + calculations

User: "Remind me to call mom next week"
(CALCULATED DATE PROVIDED: "2025-02-18T00:00:00.000Z")
Output: {
  "type": "create",
  "data": {
    "title": "call mom",
    "dueDate": "2025-02-18T00:00:00.000Z"
  },
  "localStorageCommand": "const todos = JSON.parse(localStorage.getItem('todos') || '[]'); todos.push({id: crypto.randomUUID(), title: 'call mom', completed: false, dueDate: '2025-02-18T00:00:00.000Z', createdAt: new Date().toISOString()}); localStorage.setItem('todos', JSON.stringify(todos));"
}

CORRECT: Uses the provided date string '2025-02-18T00:00:00.000Z' directly
WRONG: Would use setDate() or Date.now() calculations

User: "Mark buy milk as done"
Output: {
  "type": "update",
  "todoId": "match-by-title",
  "data": {
    "completed": true
  },
  "localStorageCommand": "const todos = JSON.parse(localStorage.getItem('todos') || '[]'); const updated = todos.map(t => t.title === 'buy milk' ? {...t, completed: true} : t); localStorage.setItem('todos', JSON.stringify(updated));"
}

User: "Delete everything"
Output: {
  "type": "clear",
  "localStorageCommand": "localStorage.setItem('todos', JSON.stringify([]));"
}

Now, parse this user message and return ONLY the JSON response, no additional text:

USER MESSAGE:
${message}
${dateContext}
${existingTodos ? `\n\nCurrent todos in localStorage:\n${existingTodos}` : ""}`;

    const response = await gemini_node(apiKey, model, systemPrompt, config);

    if (typeof response === "string") {
      return response;
    }

    if (response && typeof response === "object" && "text" in response) {
      const text = (response as { text?: string }).text;
      if (text) {
        return text;
      }
    }

    return JSON.stringify(response);
  } catch (error) {
    console.error("Error in convertor:", error);
    throw error;
  }
};

export { convertor };
export type { TodoOperation };
