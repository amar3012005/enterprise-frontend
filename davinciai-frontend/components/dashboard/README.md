# Dashboard Component Architecture

## Overview
The enterprise dashboard has been refactored into **modular, reusable components** for maximum design flexibility and maintainability.

## Component Structure

```
components/dashboard/
├── DashboardHeader.tsx      # Top navigation bar with tenant info
├── SideNavigation.tsx       # Left sidebar icon navigation
├── AgentVisualizer.tsx      # Main agent display with visualization
├── AIAssistantPanel.tsx     # Right panel with AI actions
└── StatsCards.tsx           # Bottom stats display cards
```

## Main Integration Page

**`app/enterprise/dashboard/[agent_id]/page.tsx`**

This page acts as the **integration layer** that:
- Handles authentication and data fetching
- Imports all modular components
- Passes props to each component
- Manages layout and grid structure

## Component Details

### 1. DashboardHeader
**File**: `components/dashboard/DashboardHeader.tsx`

**Props**:
- `tenantName: string` - Organization name to display
- `onLogout: () => void` - Logout callback

**Features**:
- Navigation buttons (Rent, Buy, Sell)
- Location display
- Settings and logout buttons

---

### 2. SideNavigation
**File**: `components/dashboard/SideNavigation.tsx`

**Props**:
- `onLogout: () => void` - Logout callback

**Features**:
- Vertical icon navigation
- Active state highlighting
- Logout button at bottom

---

### 3. AgentVisualizer
**File**: `components/dashboard/AgentVisualizer.tsx`

**Props**:
- `agentName: string` - Agent display name
- `agentDescription: string` - Agent description text
- `totalCalls: number` - Total call count for display

**Features**:
- Large agent name header
- Status indicator tags (L, R, F, B)
- Animated visual placeholder
- Bottom info cards (Location, Dates, Payment)

**Customization Points**:
- Replace animated placeholder with actual agent visualization
- Customize status tags
- Modify info card content

---

### 4. AIAssistantPanel
**File**: `components/dashboard/AIAssistantPanel.tsx`

**Props**: None (currently static)

**Features**:
- AI Assistant header
- 2x2 action grid:
  - Book a rent
  - Analysis
  - Insurance
  - Payment
- Chat input area with Send button

**Customization Points**:
- Add props for dynamic actions
- Connect to real chat API
- Customize action icons and labels

---

### 5. StatsCards
**File**: `components/dashboard/StatsCards.tsx`

**Props**:
- `totalCalls: number` - Total call volume
- `successRate: number` - Success rate (0-1)

**Features**:
- Two-column grid
- Highlighted active card (black background)
- Formatted percentage display

**Customization Points**:
- Add more stat cards
- Change grid layout
- Add trend indicators

---

## How to Customize

### Adding a New Component

1. **Create the component file**:
```bash
touch components/dashboard/NewComponent.tsx
```

2. **Define the component**:
```typescript
"use client";

interface NewComponentProps {
    data: string;
}

export default function NewComponent({ data }: NewComponentProps) {
    return (
        <div style={{ /* your styles */ }}>
            {data}
        </div>
    );
}
```

3. **Import in main page**:
```typescript
import NewComponent from "@/components/dashboard/NewComponent";

// In the JSX:
<NewComponent data={someData} />
```

### Modifying Existing Components

Each component is **self-contained** with:
- Its own styling (inline styles for guaranteed rendering)
- Clear prop interfaces
- No external dependencies (except icons)

**Example**: To change the AgentVisualizer background:

Edit `components/dashboard/AgentVisualizer.tsx`:
```typescript
<div style={{ 
    backgroundColor: '#fff',  // Change this
    borderRadius: '32px',
    // ... rest of styles
}}>
```

### Connecting to Real Data

Currently, components use **static or prop-based data**. To connect to APIs:

1. **Fetch data in main page** (`page.tsx`)
2. **Pass as props** to components
3. **Update component interfaces** if needed

Example:
```typescript
// In page.tsx
const [liveData, setLiveData] = useState(null);

useEffect(() => {
    fetch('/api/metrics/realtime')
        .then(res => res.json())
        .then(setLiveData);
}, []);

// Pass to component
<AIAssistantPanel liveData={liveData} />
```

---

## Benefits of This Architecture

✅ **Separation of Concerns**: Each UI element has its own file  
✅ **Easy Testing**: Components can be tested in isolation  
✅ **Reusability**: Components can be used in other pages  
✅ **Maintainability**: Changes to one component don't affect others  
✅ **Design Freedom**: Each component can be styled independently  
✅ **Scalability**: Easy to add new components without cluttering main page  

---

## Next Steps

- [ ] Add TypeScript interfaces for all props
- [ ] Create Storybook stories for each component
- [ ] Add unit tests for components
- [ ] Connect components to real-time WebSocket data
- [ ] Add loading and error states to each component
- [ ] Create variants for different screen sizes (responsive)
