# Design Guidelines: WhatsApp Web Multi-User Messaging System

## Design Approach
**System-Based Approach with Messaging Platform References**

Drawing inspiration from professional messaging and communication platforms like Twilio Console, Intercom Dashboard, and Slack Admin, combined with productivity tools like Linear and Notion. The design prioritizes clarity, efficiency, and real-time information display.

## Core Design Principles
1. **Information Hierarchy**: Critical connection status and active chats take visual priority
2. **Real-time Feedback**: Immediate visual feedback for message delivery, connection status, and incoming messages
3. **Efficiency First**: Minimize clicks to accomplish core tasks (connect WhatsApp, send messages, view chats)

## Typography System

**Font Family**: Inter or Work Sans via Google Fonts CDN

**Hierarchy**:
- Page Titles: text-2xl, font-semibold
- Section Headers: text-lg, font-medium
- Body Text: text-sm, font-normal
- Labels/Meta: text-xs, font-medium, uppercase tracking
- Code/IDs: font-mono, text-xs

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)

**Application Structure**:
- Fixed sidebar navigation (w-64) with connection management
- Main content area (flex-1) with chat interface
- Top header bar (h-16) with user profile and global actions

**Grid System**:
- Chat list: Single column, full height with overflow-y-auto
- Message view: 2-column split (chat list + message thread) on desktop, stacked on mobile
- Settings/Dashboard: 12-column grid for metrics cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

## Component Library

### Navigation & Layout
**Sidebar**:
- Logo/branding at top (h-16)
- Connection status indicator (dot + text)
- Navigation items with icons (h-10 each)
- QR scanner button (prominent, mb-4)
- Connection list with status badges
- Sticky footer with user settings

**Top Header**:
- Breadcrumb navigation (text-sm)
- Search bar (w-96 max-w-full)
- Notification bell with badge
- User avatar + dropdown

### Core Components

**QR Code Display**:
- Centered modal (max-w-md)
- QR code image (w-64 h-64, mx-auto)
- Connection ID display below
- Auto-refresh indicator
- Timer showing QR expiry

**Chat List Item**:
- Avatar (w-12 h-12, rounded-full)
- Contact name (font-medium)
- Last message preview (text-sm, truncate, max-w-xs)
- Timestamp (text-xs, text-right)
- Unread badge (absolute, top-right)
- Hover state reveals action buttons

**Message Bubble**:
- Sent messages: align-right, max-w-md, rounded-2xl with tail
- Received messages: align-left, max-w-md, rounded-2xl with tail
- Timestamp + status icons below (text-xs)
- Spacing: mb-2 between messages, mb-6 between message groups

**Status Indicators**:
- Connection status: dot + text (Connected/Disconnected/Connecting)
- Message status: checkmark icons (sent/delivered/read)
- Webhook status: badge component (active/inactive/error)

**Input Components**:

**Message Composer**:
- Fixed bottom bar (h-16)
- Text input with auto-expand up to 4 lines
- Send button (icon only, rounded-full, w-10 h-10)
- Attachment button (icon only)
- Character counter (text-xs, subtle)

**Forms (Webhook Settings)**:
- Label above input (text-sm, font-medium, mb-2)
- Input fields (h-10, rounded-lg, px-4)
- Help text below (text-xs, mt-1)
- Save button (h-10, px-6, rounded-lg)

### Data Display

**Dashboard Metrics Cards**:
- Card container (rounded-xl, p-6)
- Large metric number (text-3xl, font-bold)
- Label below (text-sm)
- Icon in corner (w-8 h-8)
- Spacing: gap-6 between cards

**Message History Table**:
- Sticky header row
- Alternating row treatment
- Fixed column widths for timestamps and status
- Expandable message preview (truncate with "show more")
- Action buttons on hover

**Connection Cards**:
- Card layout (rounded-xl, p-4)
- Header with connection ID + status badge
- QR scan button (if disconnected)
- Webhook URL display (font-mono, truncate)
- Last active timestamp
- Delete/edit actions

### Interactive Elements

**Buttons**:
- Primary: h-10, px-6, rounded-lg, font-medium
- Secondary: h-10, px-6, rounded-lg, border
- Icon-only: w-10 h-10, rounded-full
- Destructive actions: use semantic treatment

**Modals**:
- Overlay with backdrop blur
- Content container (max-w-lg, rounded-xl, p-6)
- Header with title + close button (mb-4)
- Footer with action buttons (mt-6, flex justify-end gap-4)

**Toasts/Notifications**:
- Fixed position (top-4 right-4)
- Auto-dismiss after 4 seconds
- Icon + message + close button
- Stacked if multiple (gap-2)

## Real-time Updates

**Live Message Indicators**:
- Typing indicator: animated dots in chat thread
- New message: smooth slide-in animation from bottom
- Connection status change: pulse animation on status dot
- Unread count: scale animation when incremented

**WebSocket Status**:
- Persistent indicator in header (Connected/Reconnecting)
- Visual feedback during disconnection

## Responsive Behavior

**Desktop (lg:)**:
- Full 3-column layout (sidebar + chat list + message thread)
- All features visible simultaneously

**Tablet (md:)**:
- Collapsible sidebar
- 2-column (chat list + message thread)

**Mobile (base)**:
- Stack all views
- Bottom navigation for main sections
- Full-screen message thread when chat selected
- Floating action button for new message

## Animations

Use sparingly and purposefully:
- Page transitions: None (instant)
- Message send: Quick fade-in (150ms)
- Status changes: Subtle pulse (300ms)
- Modal open/close: Scale + fade (200ms)
- NO scroll-triggered animations
- NO decorative animations

## Images

**No hero image needed** - this is a utility application, not marketing.

**Profile/Contact Images**:
- User avatars throughout (rounded-full)
- WhatsApp logo for branding in sidebar
- Placeholder avatars for contacts without images (initials-based)

## Accessibility

- Focus states on all interactive elements (ring-2, ring-offset-2)
- ARIA labels for icon-only buttons
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader announcements for new messages and status changes
- Minimum touch target size 44x44px on mobile