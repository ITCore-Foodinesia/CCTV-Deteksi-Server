# Warehouse AI Dashboard - Implementation Guide

## Project Structure

```
dashboard-ui/
├── src/
│   ├── components/
│   │   ├── WarehouseAIDashboard.jsx  # Main dashboard component
│   │   ├── Header.jsx                 # Dashboard header with branding
│   │   ├── StatsCard.jsx              # Reusable stats card component
│   │   ├── CCTVFeed.jsx               # CCTV camera feed viewer
│   │   └── ActivityLog.jsx            # Activity log list
│   ├── App.jsx                        # App entry point
│   ├── App.css                        # App styles
│   ├── index.css                      # Global styles with Tailwind
│   └── main.jsx                       # React entry point
├── tailwind.config.js                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
└── package.json                       # Dependencies
```

## Technologies Used

- **React 19.2.0** - UI framework
- **Vite 7.2.4** - Build tool and dev server
- **Tailwind CSS 3** - Utility-first CSS framework
- **Lucide React** - Icon library
- **PostCSS** - CSS processing

## Component Architecture

### 1. WarehouseAIDashboard (Main Component)
The main container component that manages state and layout:
- Manages active camera selection
- Holds activity logs data
- Displays warehouse statistics
- Coordinates all sub-components

### 2. Header
Displays the dashboard branding and system status:
- Brand logo with lime-green accent
- System status indicator (online/offline)
- Connection and AI model information
- User avatar

### 3. StatsCard
Reusable component for displaying key metrics:
- **Props**: icon, label, value, badge, colors
- **Variants**: Inbound, Outbound, Truck Activity, Capacity
- Hover effects with icon animations

### 4. CCTVFeed
CCTV camera feed viewer with AI detection overlays:
- Live badge indicator
- Multiple camera switching (1-4)
- AI detection bounding boxes (Truck, Person, Box)
- Grid overlay effect
- Fullscreen toggle button

### 5. ActivityLog
Displays real-time activity entries:
- Inbound/Outbound transaction cards
- Driver information with avatar
- Vehicle plate number
- Item count and verification status
- Animated live indicator

## Design Features

### Color Scheme
- **Background**: `#F5F7F2` (soft green-gray)
- **Accent**: Lime-400 (bright lime green)
- **Stats Cards**:
  - Emerald (Inbound)
  - Rose (Outbound)
  - Blue (Trucks)
  - Amber (Capacity)

### Glass Morphism Effects
- Frosted glass cards with backdrop blur
- Border highlights with white overlay
- Shadow effects for depth

### Responsive Design
- Mobile-first approach
- Grid layout adapts to screen size
- Hidden elements on smaller screens
- Scrollable sections with custom scrollbar

## Running the Dashboard

### Development Mode
```bash
npm run dev
```
Opens at `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Creates optimized production build in `dist/` folder

### Preview Production Build
```bash
npm run preview
```

## Customization

### Adding New Stats Cards
Edit `statsConfig` array in `WarehouseAIDashboard.jsx`:

```javascript
{
  icon: YourIcon,
  label: 'Your Label',
  value: yourValue,
  badge: 'Your Badge',
  bgColor: 'bg-color-100/50 border-color-100',
  iconColor: 'text-color-600',
  badgeColor: 'bg-color-200/50',
}
```

### Connecting Real Data
Replace mock data with API calls:
1. Create API service in `src/services/`
2. Use `useEffect` to fetch data
3. Update state with real-time data
4. Consider using WebSocket for live updates

### Camera Integration
To connect real CCTV feeds:
1. Replace background image in `CCTVFeed.jsx`
2. Use `<video>` or `<img>` element with stream URL
3. Update bounding box coordinates from detection API
4. Implement camera switching logic

## Future Enhancements

- [ ] Real-time data integration via WebSocket
- [ ] Historical data charts and analytics
- [ ] Export reports functionality
- [ ] Alert notifications system
- [ ] Multi-warehouse support
- [ ] User authentication and roles
- [ ] Dark mode toggle
- [ ] Internationalization (i18n)

## Dependencies

```json
{
  "lucide-react": "^latest",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "tailwindcss": "^3",
  "postcss": "^latest",
  "autoprefixer": "^latest"
}
```

## Notes

- The dashboard uses static data for demonstration
- AI detection overlays are simulated
- Camera feeds use placeholder images
- All animations are CSS-based for performance
