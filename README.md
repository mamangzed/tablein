# Tablein

A powerful, feature-rich JavaScript table library for creating interactive, customizable tables with advanced functionality.

## Demo

Check out the [interactive demo](https://mamangzed.github.io/tablein/) to see Tablein in action.

## Features

- **Client & Server-Side Operations**: Support for both client-side and server-side data processing
- **Advanced Pagination**: Standard pagination or infinite scroll/lazy loading
- **Sorting & Searching**: Column sorting and full table search capabilities
- **Export Functionality**: Export to Excel, PDF, or print directly
- **Custom Styling & Themes**: Multiple built-in themes and custom styling options
- **Cell Editing & Collaboration**: Real-time collaborative editing with version history
- **Data Visualizations**: Built-in visualizations including bar charts, sparklines, and distributions
- **Conditional Formatting**: Apply styling based on cell values and conditions
- **Frozen Headers & Columns**: Keep important data visible during scrolling
- **Context Menu**: Customizable right-click context menu
- **Keyboard Navigation**: Full keyboard support for accessibility
- **Business Rules & Validation**: Apply and validate business rules
- **AI-Powered Insights**: Automatic data pattern analysis

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
  - [Server-Side Processing](#server-side-processing)
  - [Infinite Scroll](#infinite-scroll)
  - [Data Visualization](#data-visualization)
  - [Collaborative Editing](#collaborative-editing)
  - [Custom Styling & Formatting](#custom-styling--formatting)
  - [Context Menu](#context-menu)
  - [AI-Powered Insights](#ai-powered-insights)
  - [Business Rules & Validation](#business-rules--validation)
  - [Conditional Formatting](#conditional-formatting)
- [Configuration Options](#configuration-options)
- [Events](#events)
- [API Methods](#api-methods)
- [Browser Support](#browser-support)
- [License](#license)

## Installation

### Using CDN

Include the library in your HTML:

```html
<!-- Required dependencies for export functionality -->
<script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>
<script src="https://unpkg.com/html2pdf.js/dist/html2pdf.bundle.min.js"></script>

<!-- Tablein library -->
<script src="https://unpkg.com/tablein/dist/tablein.min.js"></script>
<!-- or -->
 <script src="https://cdn.jsdelivr.net/npm/tablein/dist/tablein.min.js"></script>
```

### Using npm

```bash
npm install Tablein
```

Then import it in your JavaScript file:

```javascript
import Tablein from 'Tablein';
```

## Quick Start

Create a basic table with minimal configuration:

```html
<div id="my-table"></div>

<script>
  const data = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com" }
  ];

  const table = new Tablein({
    container: '#my-table',
    columns: [
      { field: 'id', title: 'ID' },
      { field: 'name', title: 'Name' },
      { field: 'email', title: 'Email' }
    ],
    data: data,
    searchable: true,
    sortable: true
  });
</script>
```

## Basic Usage

### Creating a Table from JSON Data

```javascript
const table = new Tablein({
  container: '#table-container',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'email', title: 'Email' },
    { field: 'department', title: 'Department' }
  ],
  data: yourData,
  searchable: true,
  sortable: true,
  freezeHeader: true,
  pageSize: 10
});
```

### Creating a Table from an Existing HTML Table

```javascript
const table = Tablein.fromHTML('#existing-table', {
  freezeHeader: true,
  sortable: true,
  searchable: true,
  exportOptions: {
    excel: true,
    pdf: true,
    print: true
  }
});
```

## Advanced Features

### Server-Side Processing

Handle large datasets by processing data on the server:

```javascript
const serverTable = Tablein.createServerTable(
  '#server-table-container',
  [
    { field: 'id', title: 'ID', sortable: true },
    { field: 'name', title: 'Name', sortable: true },
    { field: 'email', title: 'Email' },
    { field: 'department', title: 'Department', sortable: true }
  ],
  'api/table-data',
  {
    pageSize: 10,
    searchable: true, 
    sortable: true,
    serverParams: function(params) {
      return {
        // Add any additional params your server needs
        token: 'your-auth-token'
      };
    }
  }
);
```

### Infinite Scroll

Efficiently handle large datasets with lazy loading:

```javascript
const infiniteTable = Tablein.createInfiniteTable(
  '#infinite-table-container',
  [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'email', title: 'Email' }
  ],
  largeDataset,
  {
    batchSize: 15,
    loadThreshold: 100,
    freezeHeader: true
  }
);
```

### Data Visualization

Visualize your data right in the table:

```javascript
const visualizationTable = new Tablein({
  container: '#visualizations-table-container',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'sales', title: 'Sales' },
    { field: 'growth', title: 'Growth %' },
    { field: 'profit', title: 'Profit' }
  ],
  data: salesData,
  visualizations: true,
  visualizationPosition: 'summary',
  searchable: true,
  sortable: true
});
```

### Collaborative Editing

Enable real-time collaborative editing:

```javascript
const editableTable = new Tablein({
  container: '#editable-table',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'department', title: 'Department' },
    { field: 'salary', title: 'Salary' }
  ],
  data: employeeData,
  // Enable cell editing
  collaboration: true,
  collaborationMode: 'websocket', // 'local', 'websocket', 'polling'
  collaborationUrl: 'wss://your-collaboration-server.com',
  collaborationUser: { name: 'User', id: 1, color: '#4CAF50' },
  // Enable version history
  versionHistory: true,
  maxVersions: 10
});
```

### Custom Styling & Formatting

Apply custom styling to your table:

```javascript
const styledTable = new Tablein({
  container: '#custom-table-container',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'department', title: 'Department' },
    { field: 'performance', title: 'Performance' }
  ],
  data: employeeData,
  cssClass: 'custom-theme-table',
  theme: 'material', // Options: 'default', 'material', 'dark', 'stripe', 'compact', 'colorful'
  // Customize row and cell styles with callbacks
  rowClassName: function(row, index) {
    return index % 2 === 0 ? 'even-row' : 'odd-row';
  },
  cellClassName: function(value, row, column) {
    if (column.field === 'department' && value === 'Engineering') {
      return 'highlight-cell';
    }
    return '';
  }
});
```

### Context Menu

Add a customizable right-click menu:

```javascript
const contextMenuTable = new Tablein({
  container: '#context-menu-table',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'email', title: 'Email' }
  ],
  data: userData,
  contextMenu: [
    { 
      text: 'View Details',
      icon: '👁️',
      action: function(rowData) {
        console.log('View details for', rowData.name);
      }
    },
    { divider: true },
    { 
      text: 'Export Row',
      icon: '📤',
      action: function(rowData) {
        console.log('Exporting data:', rowData);
      }
    }
  ]
});
```

### AI-Powered Insights

Automatically analyze data patterns:

```javascript
const insightsTable = new Tablein({
  container: '#insights-table-container',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'department', title: 'Department' },
    { field: 'salesTarget', title: 'Sales Target' },
    { field: 'salesActual', title: 'Sales Actual' }
  ],
  data: generateInsightsData(50),
  // Enable AI Insights
  aiInsights: true,
  insightsPosition: 'top', // 'top', 'bottom', 'tooltip'
  insightsThreshold: 0.7, // Confidence threshold
  // Add other options
  searchable: true,
  sortable: true,
  theme: 'material'
});
```

### Business Rules & Validation

Apply and validate business rules:

```javascript
const validationTable = new Tablein({
  container: '#validation-table-container',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'email', title: 'Email' },
    { field: 'age', title: 'Age' },
    { field: 'salary', title: 'Salary' }
  ],
  data: generateDemoData(10),
  // Make cells editable
  collaboration: true,
  // Enable validation for edits
  validateOnEdit: true,
  showValidationMessages: true,
  // Define business rules
  businessRules: [
    {
      field: 'email',
      rule: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address'
    },
    {
      field: 'age',
      rule: value => value >= 18 && value <= 65,
      message: 'Age must be between 18 and 65'
    },
    {
      field: 'salary',
      rule: value => value >= 30000,
      message: 'Salary must be at least $30,000'
    },
    {
      field: 'name',
      rule: value => value.length >= 2,
      message: 'Name must be at least 2 characters'
    }
  ]
});
```

### Conditional Formatting

Apply styling based on cell values:

```javascript
const formattingTable = new Tablein({
  container: '#formatting-table-container',
  columns: [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'department', title: 'Department' },
    { field: 'salary', title: 'Salary' },
    { field: 'performance', title: 'Performance' },
    { field: 'startDate', title: 'Start Date' },
    { field: 'email', title: 'Email', width: 200 }
  ],
  data: generateDemoData(15),
  // Enable conditional formatting
  conditionalFormatting: true,
  rules: [
    {
      field: 'salary',
      condition: value => value > 50000,
      style: { backgroundColor: '#c8f7c8', fontWeight: 'bold', color: '#2a7d2a' }
    },
    {
      field: 'salary',
      condition: value => value < 40000,
      style: { backgroundColor: '#ffe0e0', color: '#a83232' }
    },
    {
      field: 'performance',
      condition: value => value === 'Excellent',
      style: { backgroundColor: '#e3f2fd', fontWeight: 'bold', color: '#1565c0' }
    },
    {
      field: 'performance',
      condition: value => value === 'Poor',
      style: { backgroundColor: '#fff0ee', fontStyle: 'italic', color: '#a21c1c' }
    }
  ],
  // Enable smart formatting
  smartFormatting: true,
  formatDetection: {
    numbers: true, // Auto-format numbers (currency, percentages, etc.)
    dates: true,   // Auto-format dates
    urls: true,    // Auto-format URLs as links
    emails: true   // Auto-format emails as mailto links
  }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | String\|Element | null | Table container selector or element |
| `data` | Array | [] | Data array for the table |
| `columns` | Array | [] | Column definitions |
| `freezeHeader` | Boolean | true | Fix header while scrolling |
| `freezeColumns` | Number | 0 | Number of columns to freeze |
| `pageSize` | Number | 10 | Rows per page |
| `serverSide` | Boolean | false | Use server-side processing |
| `serverUrl` | String | '' | URL for server requests |
| `lazyLoad` | Boolean | false | Enable lazy loading |
| `infiniteScroll` | Boolean | false | Enable infinite scroll |
| `loadThreshold` | Number | 100 | Pixels from bottom to trigger loading more data |
| `exportOptions` | Object | { excel: true, pdf: true, print: true } | Export options |
| `searchable` | Boolean | false | Enable search functionality |
| `sortable` | Boolean | true | Enable column sorting |
| `resizableColumns` | Boolean | false | Enable column resizing |
| `theme` | String | 'default' | Table theme |
| `cssClass` | String | '' | Additional custom CSS class |
| `rowClassName` | Function | null | Function to determine row class name |
| `cellClassName` | Function | null | Function to determine cell class name |
| `useHTML` | Boolean | false | Whether to use existing HTML table |
| `contextMenu` | Array\|Function | null | Custom context menu items |
| `versionHistory` | Boolean | false | Track cell version history |
| `maxVersions` | Number | 10 | Maximum versions to keep per cell |
| `visualizations` | Boolean | false | Enable data visualizations |
| `visualizationTypes` | Array | ['sparkline', 'bar', 'pie', 'progress'] | Available visualization types |
| `visualizationColors` | Array | ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0'] | Colors for charts |
| `visualizationPosition` | String | 'cell' | Position of visualizations |
| `aiInsights` | Boolean | false | Enable AI-powered data insights |
| `insightsPosition` | String | 'top' | Where to display insights |
| `conditionalFormatting` | Boolean | false | Enable conditional formatting |
| `rules` | Array | [] | Conditional formatting rules |
| `businessRules` | Array | [] | Business rules to validate data |
| `validateOnEdit` | Boolean | true | Validate data when edited |
| `showValidationMessages` | Boolean | true | Show validation messages |
| `keyboardNavigation` | Boolean | true | Enable keyboard navigation |
| `keyboardShortcuts` | Boolean | true | Enable keyboard shortcuts |
| `collaboration` | Boolean | false | Enable cell collaboration |
| `collaborationMode` | String | 'websocket' | Collaboration mode ('websocket', 'polling', 'local') |
| `collaborationUrl` | String | '' | URL for collaboration server |
| `collaborationUser` | Object | null | User information for collaboration |

## Events

Tablein supports several events you can subscribe to using the `on` method:

```javascript
table.on('rowClick', function(rowData, rowIndex) {
  console.log('Row clicked:', rowData);
});

table.on('cellEdit', function(rowIndex, columnField, newValue, oldValue) {
  console.log('Cell edited:', {rowIndex, columnField, newValue, oldValue});
});

table.on('sort', function(field, direction) {
  console.log('Table sorted by:', field, 'in direction:', direction);
});

table.on('pageChange', function(pageNumber) {
  console.log('Page changed to:', pageNumber);
});

table.on('search', function(query) {
  console.log('Search performed with query:', query);
});

table.on('export', function(type) {
  console.log('Exporting data to:', type);
});

table.on('error', function(error) {
  console.error('Table error:', error);
});
```

## API Methods

Here are the main methods you can call on a Tablein instance:

| Method | Description |
|--------|-------------|
| `refresh()` | Refresh the table data |
| `destroy()` | Remove the table and clean up resources |
| `search(query)` | Perform a search on the table data |
| `sortBy(field, direction)` | Sort the table by a specific column |
| `goToPage(pageNumber)` | Navigate to a specific page |
| `nextPage()` | Go to the next page |
| `prevPage()` | Go to the previous page |
| `exportToExcel()` | Export table data to Excel |
| `exportToPdf()` | Export table data to PDF |
| `print()` | Print the table |
| `on(eventName, handler)` | Add an event listener |
| `off(eventName, handler)` | Remove an event listener |
| `updateData(newData)` | Update the table with new data |
| `updateColumn(field, options)` | Update a column's options |
| `toggleColumn(field, visible)` | Show/hide a column |
| `toggleVisualizations()` | Toggle visualizations on/off |
| `generateInsights()` | Generate insights from the data |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE11 (with polyfills)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
