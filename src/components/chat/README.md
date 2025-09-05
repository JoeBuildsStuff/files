# Chat System Documentation

This directory contains a comprehensive chat system for data-driven applications. The chat provides contextual assistance for filtering, sorting, and navigating through data tables.

## Architecture Overview

The chat system is built with a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                           │
│  chat-bubble.tsx  chat-panel.tsx  chat-fullpage.tsx      │
│  chat-header.tsx  chat-input.tsx  chat-message.tsx       │
│  chat-messages-list.tsx  chat-history.tsx                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Hooks & Context                        │
│  use-chat.tsx  use-page-context.tsx  chat-provider.tsx   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    State Management                       │
│  chat-store.ts (Zustand with persistence)                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API & Types                            │
│  route.ts  types/chat.ts  lib/chat/constants.ts          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Chat Provider (`chat-provider.tsx`)
The main context provider that wraps the entire chat system.

**Key Features:**
- Provides chat context to all child components
- Maps Zustand store to React context
- Handles session management and UI state

**Usage:**
```tsx
import { ChatProvider } from '@/components/chat'

function App() {
  return (
    <ChatProvider>
      <YourApp />
    </ChatProvider>
  )
}
```

### 2. Chat Bubble (`chat-bubble.tsx`)
The floating chat button that appears when the chat is closed or minimized.

**Features:**
- Floating action button with hover effects
- Minimized state with close button
- Smooth transitions and animations
- Positioned to avoid overlap with maximized chat

### 3. Chat Panel (`chat-panel.tsx`)
The main chat interface container.

**States:**
- **Floating**: Normal floating panel (384px width)
- **Maximized**: Takes up right side of layout
- **Minimized**: Hidden, shows only bubble

**Layout Modes:**
- `floating`: Standard floating panel
- `inset`: Integrated into layout (maximized)
- `fullpage`: Full page dedicated chat interface

### 4. Chat Full Page (`chat-fullpage.tsx`)
A dedicated full-page chat interface for focused conversations.

**Features:**
- Full viewport height and width
- Toggle group for switching between layout modes
- Centered content with max-width constraint
- Back navigation to workspace
- Same functionality as regular chat panel

**Layout Mode Toggle:**
- **Floating Mode**: `PictureInPicture2` icon - Returns to floating panel
- **Inset Mode**: `PanelRight` icon - Returns to inset layout
- **Full Page Mode**: `LaptopMinimal` icon - Current mode (refresh)

**Navigation:**
- Accessible via `/workspace/chat/[session-id]` route
- Automatic session switching and layout mode setting
- Seamless integration with existing chat store

### 5. Chat Header (`chat-header.tsx`)
The top bar of the chat panel with navigation and controls.

**Features:**
- Session title editing
- Chat history navigation
- Layout mode switching (floating, inset, fullpage)
- Clear chat functionality
- Dropdown menu with actions
- Full page navigation option

### 6. Chat Messages List (`chat-messages-list.tsx`)
Displays the conversation history with auto-scrolling.

**Features:**
- Auto-scroll to bottom on new messages
- Loading state with spinner
- Empty state with call-to-action
- Smooth scrolling animations

### 7. Chat Message (`chat-message.tsx`)
Individual message component with different styles for user/assistant/system.

**Message Types:**
- **User**: Right-aligned, primary color
- **Assistant**: Left-aligned, muted background
- **System**: Centered, italic, smaller text

**Features:**
- Timestamp display
- Suggested actions as buttons
- Loading placeholder component

### 8. Chat Input (`chat-input.tsx`)
The message input area with auto-resize and send functionality.

**Features:**
- Auto-resizing textarea
- Enter to send (Shift+Enter for new line)
- Loading state during API calls
- Disabled state when processing
- **File attachment support** with drag-and-drop
- **Attachment preview** with file info and delete functionality
- **Conditional padding** based on layout mode (p-0 for fullpage, p-2 for others)

**File Attachments:**
- Click paperclip icon to select files
- Supports multiple file types (images, documents, audio, video)
- Shows file name, type, and size
- Individual delete buttons for each attachment
- Files are sent with the message to the API
- Attachment information is included in the AI prompt

**Attachment Interface:**
```typescript
interface Attachment {
  id: string
  file: File
  name: string
  size: number
  type: string
}
```

**Usage:**
```tsx
// Files are automatically handled when sent
await sendMessage("Analyze this document", attachments)
```

### 9. Chat History (`chat-history.tsx`)
Session management interface showing all chat sessions.

**Features:**
- List of all chat sessions
- Session deletion with confirmation
- Session switching
- New chat creation
- Session metadata (message count, last updated)

## State Management

### Chat Store (`lib/chat/chat-store.ts`)
Built with Zustand for efficient state management and persistence.

**Key State:**
```typescript
interface ChatStore {
  // Session management
  sessions: ChatSession[]
  currentSessionId: string | null
  currentSession: ChatSession | null
  messages: ChatMessage[]
  
  // UI State
  isOpen: boolean
  isMinimized: boolean
  isMaximized: boolean
  isLoading: boolean
  showHistory: boolean
  layoutMode: 'floating' | 'inset' | 'fullpage'
  
  // Context
  currentContext: PageContext | null
}
```

**Persistence:**
- Stores last 10 sessions
- Keeps last 50 messages per session
- Serializes dates for localStorage compatibility

## Hooks

### useChat (`hooks/use-chat.tsx`)
Main hook for chat functionality with API integration.

**Key Methods:**
- `sendMessage(content)`: Send message to API
- `handleActionClick(action)`: Execute suggested actions
- `updatePageContext(context)`: Update current page context

**API Integration:**
- Sends messages to `/api/chat`
- Includes conversation history and page context
- Handles loading states and errors

### usePageContext (`hooks/use-page-context.tsx`)
Extracts page context from URL search parameters and data.

**Context Extraction:**
- Parses filters, sorting, and pagination from URL
- Creates data summary for AI context
- Provides helper methods for context description

**Usage with Tables:**
```tsx
import { TableWithPageContext } from '@/components/chat'

function DataTable() {
  return (
    <TableWithPageContext data={data} count={totalCount}>
      <YourTableComponent />
    </TableWithPageContext>
  )
}
```

## API Integration

### Chat API Route (`app/api/chat/route.ts`)
Handles chat requests with Anthropic Claude integration.

**Request Format:**
```typescript
{
  message: string
  context?: PageContext
  messages?: ChatMessage[]
  attachments?: Array<{
    file: File
    name: string
    type: string
    size: number
  }>
}
```

**File Upload Support:**
- Uses `FormData` for multipart requests
- Supports multiple file attachments
- Files are processed and included in AI prompt
- Attachment metadata (name, type, size) is preserved
- Backward compatible with JSON-only requests

**Response Format:**
```typescript
{
  message: string
  actions?: ChatAction[]
}
```

**Context-Aware Prompts:**
- Includes current filters and sorting
- Provides data sample for context
- Maintains conversation history
- Generates actionable suggestions

## Types and Interfaces

### Core Types (`types/chat.ts`)
Defines all TypeScript interfaces for the chat system.

**Key Types:**
- `ChatMessage`: Individual message with role and content
- `ChatAction`: Suggested action with type and payload
- `PageContext`: Current page state (filters, data, etc.)
- `ChatSession`: Chat conversation with messages
- `ChatContextValue`: React context interface

### Constants (`lib/chat/constants.ts`)
Configuration and constants for the chat system.

**Categories:**
- Chat configuration (timeouts, limits)
- UI dimensions and styling
- Message roles and action types
- Storage keys and default messages
- Context analysis patterns

## Full Page Chat Mode

### Route-Based Chat Sessions
The chat system supports dedicated full-page sessions accessible via URL routing.

**Route Structure:**
```
/workspace/chat/[session-id]
```

**Features:**
- Direct access to specific chat sessions
- Full viewport utilization for focused conversations
- Toggle group for switching between layout modes
- Automatic session switching and state management
- Seamless navigation back to workspace

**Implementation:**
```tsx
// Page component: app/(workspace)/workspace/chat/[id]/page.tsx
export default function ChatPage() {
  const params = useParams()
  const chatId = params.id as string
  const { switchToSession, setLayoutMode } = useChatStore()

  useEffect(() => {
    if (chatId) {
      switchToSession(chatId)
      setLayoutMode('fullpage')
    }
  }, [chatId, switchToSession, setLayoutMode])

  return (
    <ChatProvider>
      <ChatFullPage />
    </ChatProvider>
  )
}
```

**Navigation Methods:**
1. **From Chat Header**: Layout dropdown → "Full Page" option
2. **Direct URL**: Navigate to `/workspace/chat/[session-id]`
3. **Programmatic**: `router.push('/workspace/chat/' + sessionId)`

## Integration with Data Tables

### TableWithPageContext Component
Wrapper component that provides page context to the chat system.

**How it works:**
1. Extracts context from table data and URL parameters
2. Updates chat context when data changes
3. Enables AI to understand current data view

**Usage:**
```tsx
<TableWithPageContext data={tableData} count={totalCount}>
  <DataTable />
</TableWithPageContext>
```

## Context Flow

1. **Page Load**: `usePageContext` extracts filters/sorting from URL
2. **Data Update**: `TableWithPageContext` updates chat context
3. **User Input**: Chat sends context + message to API
4. **AI Response**: API returns message + suggested actions
5. **Action Execution**: Actions can modify filters, sorting, or navigation

## Suggested Actions

The AI can suggest four types of actions:

### 1. Filter Actions
```typescript
{
  type: 'filter',
  label: 'Show active users',
  payload: {
    columnId: 'status',
    operator: 'eq',
    value: 'active'
  }
}
```

### 2. Sort Actions
```typescript
{
  type: 'sort',
  label: 'Sort by name',
  payload: {
    columnId: 'name',
    direction: 'asc'
  }
}
```

### 3. Navigation Actions
```typescript
{
  type: 'navigate',
  label: 'Go to users page',
  payload: {
    pathname: '/users',
    clearFilters: true
  }
}
```

### 4. Create Actions
```typescript
{
  type: 'create',
  label: 'Add new user',
  payload: {
    action: 'openForm',
    type: 'user'
  }
}
```

## Styling and Theming

The chat system uses:
- **Tailwind CSS** for styling
- **CSS Variables** for theming
- **Smooth transitions** for state changes
- **Responsive design** for mobile/desktop
- **Dark/light mode** support

## Performance Considerations

- **Message limits**: 50 stored, 100 displayed
- **Session limits**: 10 sessions persisted
- **Context limits**: 3 data samples sent to API
- **Auto-scroll**: Only when near bottom
- **Lazy loading**: Components load on demand

## Error Handling

- **API errors**: Graceful fallback messages
- **Network issues**: Retry mechanism
- **Invalid actions**: Validation and filtering
- **Storage errors**: Fallback to memory-only mode

## Browser Compatibility

- **Modern browsers**: Full functionality
- **LocalStorage**: Required for persistence
- **ES6+ features**: Used throughout
- **CSS Grid/Flexbox**: For layouts

## Development

### Adding New Features

1. **Update types** in `types/chat.ts`
2. **Add state** to `chat-store.ts`
3. **Create components** in chat directory
4. **Update API** in `route.ts` if needed
5. **Test integration** with data tables

### Debugging

- Check browser console for errors
- Verify API responses in Network tab
- Test context updates with React DevTools
- Validate localStorage persistence

### Testing

- Test all chat states (open, minimized, maximized)
- Verify context extraction from different pages
- Test action execution and navigation
- Validate persistence across page reloads 