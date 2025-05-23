/**
 * Tabelin - A comprehensive table library
 * Features:
 * - Initialize from existing HTML table or JSON data
 * - Freeze headers and rows
 * - Export to Excel, PDF and Print
 * - Lazy loading without pagination
 * - Server-side processing with search, sort and pagination
 * - Custom context menu
 * - Multiple styling options
 * - Global or per-table configuration
 * - AI-Powered Data Insights
 */

class Tabelin {
  constructor(options = {}) {
    this.options = {
      // Default options
      container: null,
      data: [],
      columns: [],
      freezeHeader: true,
      freezeColumns: 0,
      pageSize: 10,
      serverSide: false,
      serverUrl: '',
      serverParams: null, // Custom function to generate server parameters
      lazyLoad: false,
      infiniteScroll: false,
      loadThreshold: 100,
      exportOptions: {
        excel: true,
        pdf: true,
        print: true
      },
      searchable: false,
      sortable: true,
      resizableColumns: false,
      theme: 'default',
      useHTML: false, // Whether to use existing HTML table
      contextMenu: null, // Custom context menu items
      cssClass: '', // Additional custom CSS class
      rowClassName: null, // Function to determine row class name
      cellClassName: null, // Function to determine cell class name
      aiInsights: false, // Enable AI-powered data insights
      insightsPosition: 'top', // 'top', 'bottom', 'tooltip'
      insightsThreshold: 0.7, // Confidence threshold for showing insights
      
      // Cell collaboration features
      collaboration: false, // Enable cell collaboration
      collaborationMode: 'websocket', // 'websocket', 'polling', 'local'
      collaborationUrl: '', // URL for collaboration server
      collaborationInterval: 2000, // Polling interval in ms if using polling mode
      collaborationUser: null, // User information for collaboration
      versionHistory: false, // Track cell version history
      maxVersions: 10, // Maximum versions to keep per cell
      
      // Data visualization features
      visualizations: false, // Enable data visualizations
      visualizationTypes: ['sparkline', 'bar', 'pie', 'progress'], // Available types
      visualizationColors: ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0'], // Colors for charts
      visualizationSize: 'medium', // 'small', 'medium', 'large'
      visualizationPosition: 'cell', // 'cell', 'row', 'column', 'summary'
      visualizationThreshold: 5, // Minimum data points to show visualizations
      
      // Conditional formatting and business rules
      conditionalFormatting: false, // Enable conditional formatting
      rules: [], // Array of formatting rules
      smartFormatting: false, // Enable automatic smart formatting
      formatDetection: {
        numbers: true, // Auto-format numbers (currency, percentages, etc.)
        dates: true,   // Auto-format dates
        urls: true,    // Auto-format URLs as links
        emails: true   // Auto-format emails as mailto links
      },
      businessRules: [], // Business rules to validate data
      validateOnEdit: true, // Validate data when edited
      showValidationMessages: true, // Show validation messages
      
      // Keyboard navigation and accessibility
      keyboardNavigation: true, // Enable keyboard navigation
      keyboardShortcuts: true, // Enable keyboard shortcuts
      accessibleHeaders: true, // Use proper ARIA attributes for headers
      focusableRows: true, // Make rows focusable for screen readers
      ariaLabels: {
        table: 'Data Table',
        search: 'Search table',
        pagination: 'Table pagination',
        sortAsc: 'Sort column ascending',
        sortDesc: 'Sort column descending',
        row: index => `Row ${index + 1}`
      },
      
      // User options override defaults
      ...options
    };
    
    this.currentPage = 1;
    this.totalPages = 1;
    this.isBusy = false;
    this.loadedRows = 0;
    this.tableElement = null;
    this.tableContainer = null;
    this.paginationElement = null;
    this.toolbarElement = null;
    this.searchElement = null;
    this.contextMenuElement = null;
    this.originalData = [];
    this.totalRecords = 0;
    this.searchTerm = '';
    this.sortField = '';
    this.sortDirection = 'asc';
    this.insights = []; // Store generated insights
    this.cellVersions = new Map(); // Store cell version history
    this.collaborationSocket = null; // WebSocket for real-time collaboration
    this.collaborationTimer = null; // Timer for polling mode
    this.pendingChanges = []; // Changes waiting to be sent to collaboration server
    this.visualizationsCache = new Map(); // Cache for rendered visualizations
    this.rulesEngine = null; // Rules engine instance
    this.validationErrors = new Map(); // Map of validation errors by cell key
    this.formattingCache = new Map(); // Cache for formatted values
    this.ruleEvaluations = new Map(); // Cache for rule evaluations
    this.activeCell = { rowIndex: -1, columnIndex: -1 }; // Currently active/focused cell
    this.keyboardNavigationEnabled = false; // Will be enabled after initialization
    this.shortcuts = {}; // Keyboard shortcut handlers
    
    if (this.options.data && Array.isArray(this.options.data)) {
      this.originalData = [...this.options.data];
    }
    
    this.init();
  }
  
  /**
   * Initialize the table
   */
  init() {
    if (!this.options.container) {
      throw new Error('Container element is required');
    }
    
    const container = typeof this.options.container === 'string' 
      ? document.querySelector(this.options.container) 
      : this.options.container;
      
    if (!container) {
      throw new Error('Container element not found');
    }
    
    this.tableContainer = document.createElement('div');
    this.tableContainer.className = 'advanced-table-container';
    
    if (this.options.theme) {
      this.tableContainer.classList.add(`advanced-table-theme-${this.options.theme}`);
    }
    
    if (this.options.cssClass) {
      this.tableContainer.classList.add(this.options.cssClass);
    }
    
    container.appendChild(this.tableContainer);
    
    // Create toolbar with export buttons and search
    this.createToolbar();
    
    // Create or use existing table
    if (this.options.useHTML) {
      this.initFromHTML(container);
    } else {
      this.createTable();
    }
    
    // Create pagination if not infinite scroll
    if (!this.options.infiniteScroll && !this.options.lazyLoad) {
      this.createPagination();
    }
    
    // Create context menu if provided
    if (this.options.contextMenu) {
      this.createContextMenu();
    }
    
    // Create insights panel if enabled
    if (this.options.aiInsights) {
      this.createInsightsPanel();
    }
    
    // Initialize visualization features
    if (this.options.visualizations) {
      this.initVisualizations();
    }
    
    // Initialize conditional formatting and rules engine
    if (this.options.conditionalFormatting || this.options.businessRules.length > 0) {
      this.initRulesEngine();
    }
    
    // Load data
    this.loadData();
    
    // Add event listeners
    this.attachEventListeners();
    
    // Initialize collaboration features
    this.initCollaboration();
  }
  
  /**
   * Initialize from existing HTML table
   */
  initFromHTML(container) {
    // Find existing table
    let existingTable = null;
    
    if (typeof this.options.useHTML === 'string') {
      existingTable = document.querySelector(this.options.useHTML);
    } else if (this.options.useHTML instanceof HTMLTableElement) {
      existingTable = this.options.useHTML;
    } else {
      // Look for table inside container
      existingTable = container.querySelector('table');
    }
    
    if (!existingTable) {
      throw new Error('Existing HTML table not found');
    }
    
    // Create table wrapper
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'advanced-table-wrapper';
    
    // Clone the table to avoid modifying the original directly
    this.tableElement = existingTable.cloneNode(true);
    this.tableElement.className = 'advanced-table';
    
    if (existingTable.className) {
      this.tableElement.className += ' ' + existingTable.className;
    }
    
    // Extract column information from the table headers
    const headers = this.tableElement.querySelectorAll('thead th');
    this.options.columns = [];
    
    headers.forEach((header, index) => {
      const title = header.textContent.trim();
      const field = header.getAttribute('data-field') || `column${index}`;
      const width = header.style.width || null;
      const sortable = header.getAttribute('data-sortable') !== 'false';
      
      this.options.columns.push({ field, title, width, sortable });
    });
    
    // Extract data from the rows if no data was provided
    if (this.originalData.length === 0) {
      const rows = this.tableElement.querySelectorAll('tbody tr');
      const data = [];
      
      rows.forEach(row => {
        const rowData = {};
        const cells = row.querySelectorAll('td');
        
        cells.forEach((cell, index) => {
          const field = this.options.columns[index] ? this.options.columns[index].field : `column${index}`;
          rowData[field] = cell.textContent.trim();
        });
        
        data.push(rowData);
      });
      
      this.originalData = data;
      this.options.data = data;
    }
    
    // Empty the table body as we'll populate it later
    const tbody = this.tableElement.querySelector('tbody');
    if (tbody) tbody.innerHTML = '';
    
    // Add the table to the wrapper
    tableWrapper.appendChild(this.tableElement);
    this.tableContainer.appendChild(tableWrapper);
    
    // Apply frozen headers if enabled
    if (this.options.freezeHeader) {
      tableWrapper.classList.add('freeze-header');
    }
    
    // Apply frozen columns if enabled
    if (this.options.freezeColumns > 0) {
      tableWrapper.classList.add('freeze-columns');
      tableWrapper.style.setProperty('--freeze-columns', this.options.freezeColumns);
    }
  }
  
  /**
   * Create table toolbar with export buttons and search
   */
  createToolbar() {
    this.toolbarElement = document.createElement('div');
    this.toolbarElement.className = 'advanced-table-toolbar';
    
    // Add search field if searchable
    if (this.options.searchable) {
      this.searchElement = document.createElement('div');
      this.searchElement.className = 'advanced-table-search';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search...';
      
      if (this.options.serverSide) {
        // For server-side, use debounce to avoid too many requests
        let debounceTimeout;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            this.searchTerm = e.target.value;
            this.currentPage = 1;
            this.loadedRows = 0;
            this.loadData();
          }, 300);
        });
      } else {
        // For client-side search, filter immediately
        searchInput.addEventListener('input', (e) => this.search(e.target.value));
      }
      
      this.searchElement.appendChild(searchInput);
      this.toolbarElement.appendChild(this.searchElement);
    }
    
    // Add toolbar spacer
    const spacer = document.createElement('div');
    spacer.className = 'toolbar-spacer';
    this.toolbarElement.appendChild(spacer);
    
    // Add export options
    const exportOptions = this.options.exportOptions;
    const exportGroup = document.createElement('div');
    exportGroup.className = 'export-buttons';
    
    if (exportOptions.excel) {
      const excelBtn = document.createElement('button');
      excelBtn.textContent = 'Export to Excel';
      excelBtn.className = 'excel-btn';
      excelBtn.addEventListener('click', () => this.exportToExcel());
      exportGroup.appendChild(excelBtn);
    }
    
    if (exportOptions.pdf) {
      const pdfBtn = document.createElement('button');
      pdfBtn.textContent = 'Export to PDF';
      pdfBtn.className = 'pdf-btn';
      pdfBtn.addEventListener('click', () => this.exportToPdf());
      exportGroup.appendChild(pdfBtn);
    }
    
    if (exportOptions.print) {
      const printBtn = document.createElement('button');
      printBtn.textContent = 'Print';
      printBtn.className = 'print-btn';
      printBtn.addEventListener('click', () => this.print());
      exportGroup.appendChild(printBtn);
    }
    
    this.toolbarElement.appendChild(exportGroup);
    this.tableContainer.appendChild(this.toolbarElement);
  }
  
  /**
   * Create the table element
   */
  createTable() {
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'advanced-table-wrapper';
    
    this.tableElement = document.createElement('table');
    this.tableElement.className = 'advanced-table';
    
    if (this.options.cssClass) {
      this.tableElement.classList.add(this.options.cssClass);
    }
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Create header cells
    this.options.columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.title || column.field;
      
      if (column.sortable !== false && this.options.sortable) {
        th.classList.add('sortable');
        th.addEventListener('click', () => this.sortBy(column.field));
      }
      
      if (column.width) {
        th.style.width = typeof column.width === 'number' 
          ? `${column.width}px` 
          : column.width;
      }
      
      // Add data attributes
      th.setAttribute('data-field', column.field);
      
      if (column.className) {
        th.className = column.className;
      }
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    this.tableElement.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    this.tableElement.appendChild(tbody);
    
    tableWrapper.appendChild(this.tableElement);
    this.tableContainer.appendChild(tableWrapper);
    
    // Apply frozen headers if enabled
    if (this.options.freezeHeader) {
      tableWrapper.classList.add('freeze-header');
    }
    
    // Apply frozen columns if enabled
    if (this.options.freezeColumns > 0) {
      tableWrapper.classList.add('freeze-columns');
      tableWrapper.style.setProperty('--freeze-columns', this.options.freezeColumns);
    }
  }
  
  /**
   * Create pagination controls
   */
  createPagination() {
    this.paginationElement = document.createElement('div');
    this.paginationElement.className = 'advanced-table-pagination';
    
    const pageSizeSelector = document.createElement('select');
    pageSizeSelector.className = 'page-size-selector';
    
    [5, 10, 20, 50, 100].forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = size;
      option.selected = this.options.pageSize === size;
      pageSizeSelector.appendChild(option);
    });
    
    pageSizeSelector.addEventListener('change', (e) => {
      this.options.pageSize = parseInt(e.target.value, 10);
      this.currentPage = 1;
      this.loadData();
    });
    
    const pageSizeContainer = document.createElement('div');
    pageSizeContainer.className = 'page-size-container';
    pageSizeContainer.textContent = 'Rows per page: ';
    pageSizeContainer.appendChild(pageSizeSelector);
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => this.prevPage());
    
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => this.nextPage());
    
    const firstBtn = document.createElement('button');
    firstBtn.textContent = '<<';
    firstBtn.className = 'first-page';
    firstBtn.addEventListener('click', () => this.goToPage(1));
    
    const lastBtn = document.createElement('button');
    lastBtn.textContent = '>>';
    lastBtn.className = 'last-page';
    lastBtn.addEventListener('click', () => this.goToPage(this.totalPages));
    
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    paginationControls.appendChild(firstBtn);
    paginationControls.appendChild(prevBtn);
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(nextBtn);
    paginationControls.appendChild(lastBtn);
    
    this.paginationElement.appendChild(pageSizeContainer);
    this.paginationElement.appendChild(paginationControls);
    
    this.tableContainer.appendChild(this.paginationElement);
    this.updatePaginationInfo();
  }
  
  /**
   * Create context menu
   */
  createContextMenu() {
    this.contextMenuElement = document.createElement('div');
    this.contextMenuElement.className = 'advanced-table-context-menu';
    this.contextMenuElement.style.display = 'none';
    document.body.appendChild(this.contextMenuElement);
  }
  
  /**
   * Create insights panel for AI-powered data analysis
   */
  createInsightsPanel() {
    this.insightsElement = document.createElement('div');
    this.insightsElement.className = 'advanced-table-insights';
    
    if (this.options.insightsPosition === 'top') {
      this.tableContainer.insertBefore(this.insightsElement, this.tableContainer.firstChild);
    } else if (this.options.insightsPosition === 'bottom') {
      this.tableContainer.appendChild(this.insightsElement);
    }
    
    // Add toggle button to toolbar
    const insightsBtn = document.createElement('button');
    insightsBtn.textContent = 'Show Insights';
    insightsBtn.className = 'insights-btn';
    insightsBtn.addEventListener('click', () => this.toggleInsights());
    
    this.toolbarElement.querySelector('.export-buttons').appendChild(insightsBtn);
  }
  
  /**
   * Toggle insights panel visibility
   */
  toggleInsights() {
    if (this.insightsElement.classList.contains('active')) {
      this.insightsElement.classList.remove('active');
      this.toolbarElement.querySelector('.insights-btn').textContent = 'Show Insights';
    } else {
      this.insightsElement.classList.add('active');
      this.toolbarElement.querySelector('.insights-btn').textContent = 'Hide Insights';
      this.generateInsights();
    }
  }
  
  /**
   * Generate insights based on table data
   */
  generateInsights() {
    this.insightsElement.innerHTML = '<div class="insights-loading">Analyzing data...</div>';
    
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      const insights = [];
      const data = this.originalData;
      
      if (!data || data.length === 0) {
        this.insightsElement.innerHTML = '<div class="insights-empty">No data to analyze</div>';
        return;
      }
      
      // Sample size check
      if (data.length < 5) {
        insights.push({
          type: 'info',
          message: 'Sample size is too small for meaningful analysis',
          confidence: 1.0
        });
      }
      
      // For numeric columns: min, max, avg, outliers
      this.options.columns.forEach(column => {
        const values = data.map(row => row[column.field]).filter(val => val !== null && val !== undefined);
        
        // Check if column contains numeric values
        if (values.length > 0 && !isNaN(parseFloat(values[0]))) {
          const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
          
          if (numericValues.length > 3) {
            // Calculate statistics
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const avg = sum / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            
            // Standard deviation
            const variance = numericValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / numericValues.length;
            const stdDev = Math.sqrt(variance);
            
            // Find outliers (values more than 2 standard deviations from mean)
            const outliers = numericValues.filter(v => Math.abs(v - avg) > 2 * stdDev);
            
            if (outliers.length > 0) {
              insights.push({
                type: 'warning',
                message: `Found ${outliers.length} outliers in column "${column.title || column.field}"`,
                detail: `Values that deviate significantly from the average (${avg.toFixed(2)})`,
                confidence: 0.8
              });
            }
            
            insights.push({
              type: 'info',
              message: `Statistics for "${column.title || column.field}": Min=${min}, Max=${max}, Avg=${avg.toFixed(2)}`,
              confidence: 0.9
            });
          }
        }
        
        // Check for empty values
        const emptyCount = values.filter(v => v === '' || v === null || v === undefined).length;
        const emptyPercentage = (emptyCount / data.length) * 100;
        
        if (emptyPercentage > 10) {
          insights.push({
            type: 'warning',
            message: `${emptyPercentage.toFixed(1)}% of values in "${column.title || column.field}" are empty`,
            confidence: 0.85
          });
        }
        
        // Check for duplicate values in ID-like columns
        if (column.field.toLowerCase().includes('id')) {
          const uniqueValues = new Set(values);
          if (uniqueValues.size !== values.length) {
            insights.push({
              type: 'error',
              message: `Found duplicate values in "${column.title || column.field}" column`,
              confidence: 0.95
            });
          }
        }
      });
      
      // Filter insights by confidence threshold
      this.insights = insights.filter(insight => insight.confidence >= this.options.insightsThreshold);
      
      // Display insights
      this.renderInsights();
    }, 100);
  }
  
  /**
   * Render insights in the insights panel
   */
  renderInsights() {
    if (!this.insightsElement) {
      console.warn('Insights element not found');
      return;
    }
    
    if (this.insights.length === 0) {
      this.insightsElement.innerHTML = '<div class="insights-empty">No significant patterns detected in the data</div>';
      return;
    }
    
    this.insightsElement.innerHTML = '';
    const insightsList = document.createElement('ul');
    insightsList.className = 'insights-list';
    this.insightsElement.appendChild(insightsList);
    
    this.insights.forEach(insight => {
      const insightItem = document.createElement('li');
      insightItem.className = `insight-item insight-${insight.type}`;
      
      const insightIcon = document.createElement('span');
      insightIcon.className = 'insight-icon';
      insightIcon.textContent = insight.type === 'info' ? 'ℹ️' : insight.type === 'warning' ? '⚠️' : '❗';
      
      const insightContent = document.createElement('div');
      insightContent.className = 'insight-content';
      
      const insightMessage = document.createElement('div');
      insightMessage.className = 'insight-message';
      insightMessage.textContent = insight.message;
      
      insightContent.appendChild(insightMessage);
      
      if (insight.detail) {
        const insightDetail = document.createElement('div');
        insightDetail.className = 'insight-detail';
        insightDetail.textContent = insight.detail;
        insightContent.appendChild(insightDetail);
      }
      
      insightItem.appendChild(insightIcon);
      insightItem.appendChild(insightContent);
      
      insightsList.appendChild(insightItem);
    });
  }

  updatePaginationInfo() {
    const pageInfo = this.paginationElement.querySelector('.page-info');
    const startRecord = ((this.currentPage - 1) * this.options.pageSize) + 1;
    const endRecord = Math.min(this.currentPage * this.options.pageSize, this.totalRecords);
    
    if (this.options.serverSide) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages} (${startRecord}-${endRecord} of ${this.totalRecords})`;
    } else {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
    
    // Disable/enable pagination buttons
    const firstBtn = this.paginationElement.querySelector('.first-page');
    const prevBtn = this.paginationElement.querySelector('button:nth-child(2)');
    const nextBtn = this.paginationElement.querySelector('button:nth-child(4)');
    const lastBtn = this.paginationElement.querySelector('.last-page');
    
    firstBtn.disabled = this.currentPage === 1;
    prevBtn.disabled = this.currentPage === 1;
    nextBtn.disabled = this.currentPage === this.totalPages;
    lastBtn.disabled = this.currentPage === this.totalPages;
  }
  
  /**
   * Load data into the table
   */
  loadData() {
    if (this.isBusy) return;
    
    this.isBusy = true;
    this.tableElement.classList.add('loading');
    
    if (this.options.serverSide) {
      // Server-side data processing
      this.loadServerData();
    } else {
      // Client-side data processing
      this.loadClientData();
    }
  }
  
  /**
   * Load data from server
   */
  loadServerData() {
    const params = this.buildServerParams();
    
    // Prepare request options for fetch
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Convert params to query string
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.options.serverUrl}?${queryString}`;
    
    fetch(url, fetchOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (this.options.infiniteScroll || this.options.lazyLoad) {
          this.appendData(data.items || data.data || []);
          this.loadedRows += (data.items || data.data || []).length;
          this.hasMoreData = (data.items || data.data || []).length >= this.options.pageSize;
        } else {
          this.renderData(data.items || data.data || []);
          this.totalPages = data.totalPages || Math.ceil(data.totalRecords / this.options.pageSize) || 1;
          this.totalRecords = data.totalRecords || data.recordsTotal || data.recordsFiltered || 0;
          this.updatePaginationInfo();
        }
        
        this.isBusy = false;
        this.tableElement.classList.remove('loading');
      })
      .catch(error => {
        console.error('Error loading data:', error);
        this.isBusy = false;
        this.tableElement.classList.remove('loading');
        
        // Show error message in the table
        const tbody = this.tableElement.querySelector('tbody');
        tbody.innerHTML = '';
        const errorRow = document.createElement('tr');
        const errorCell = document.createElement('td');
        errorCell.colSpan = this.options.columns.length;
        errorCell.className = 'error-message';
        errorCell.textContent = `Error loading data: ${error.message}`;
        errorRow.appendChild(errorCell);
        tbody.appendChild(errorRow);
      });
  }
  
  /**
   * Build parameters for server request
   */
  buildServerParams() {
    let params = {};
    
    if (this.options.infiniteScroll || this.options.lazyLoad) {
      params.start = this.loadedRows;
      params.length = this.options.pageSize;
    } else {
      params.page = this.currentPage;
      params.pageSize = this.options.pageSize;
    }
    
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    
    if (this.sortField) {
      params.sortField = this.sortField;
      params.sortOrder = this.sortDirection;
    }
    
    // Allow custom parameters through serverParams function
    if (typeof this.options.serverParams === 'function') {
      const customParams = this.options.serverParams(params);
      params = { ...params, ...customParams };
    }
    
    return params;
  }
  
  /**
   * Process client-side data
   */
  loadClientData() {
    const data = this.options.data || [];
    
    if (this.options.infiniteScroll || this.options.lazyLoad) {
      // For infinite scroll or lazy load, load first batch
      const initialCount = Math.min(this.options.pageSize, data.length);
      const initialData = data.slice(0, initialCount);
      
      if (this.loadedRows === 0) {
        this.renderData(initialData);
      } else {
        this.appendData(initialData);
      }
      
      this.loadedRows = initialCount;
      this.hasMoreData = this.loadedRows < data.length;
    } else {
      // For pagination
      const startIndex = (this.currentPage - 1) * this.options.pageSize;
      const endIndex = startIndex + this.options.pageSize;
      
      const pageData = data.slice(startIndex, endIndex);
      this.renderData(pageData);
      
      this.totalRecords = data.length;
      this.totalPages = Math.ceil(data.length / this.options.pageSize);
      this.updatePaginationInfo();
    }
    
    this.isBusy = false;
    this.tableElement.classList.remove('loading');
  }
  
  /**
   * Render data to the table
   */
  renderData(data) {
    const tbody = this.tableElement.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      // Show no data message
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = this.options.columns.length;
      emptyCell.className = 'no-data-message';
      emptyCell.textContent = 'No data available';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }
    
    data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-row-index', rowIndex);
      
      // Add row class if provided
      if (typeof this.options.rowClassName === 'function') {
        const className = this.options.rowClassName(row, rowIndex);
        if (className) {
          tr.classList.add(className);
        }
      }
      
      // Add ARIA attributes for accessibility
      if (this.options.accessibleHeaders && this.options.ariaLabels?.row) {
        tr.setAttribute('aria-label', typeof this.options.ariaLabels.row === 'function' 
          ? this.options.ariaLabels.row(rowIndex) 
          : this.options.ariaLabels.row);
      }
      
      if (this.options.focusableRows) {
        tr.setAttribute('tabindex', '0');
      }
      
      this.options.columns.forEach((column, columnIndex) => {
        const td = document.createElement('td');
        const value = row[column.field];
        
        // Use custom renderer if provided
        if (typeof column.render === 'function') {
          td.innerHTML = column.render(value, row, column);
        } else {
          // Apply smart formatting if enabled
          if (this.options.smartFormatting) {
            td.innerHTML = this.applySmartFormatting(value, column);
          } else {
            td.textContent = value !== undefined && value !== null ? value : '';
          }
        }
        
        // Apply conditional formatting
        if (this.options.conditionalFormatting) {
          this.applyConditionalFormatting(td, value, row, column);
        }
        
        // Add cell class if provided
        if (typeof this.options.cellClassName === 'function') {
          const className = this.options.cellClassName(value, row, column, columnIndex);
          if (className) {
            td.classList.add(className);
          }
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
  }
  
  /**
   * Apply conditional formatting to a cell
   */
  applyConditionalFormatting(cell, value, row, column) {
    if (!this.options.rules || !this.options.rules.length) return;
    
    for (const rule of this.options.rules) {
      if (rule.field === column.field) {
        // Check if condition is met
        let conditionMet = false;
        
        if (typeof rule.condition === 'function') {
          conditionMet = rule.condition(value, row);
        } else if (rule.condition instanceof RegExp) {
          conditionMet = rule.condition.test(String(value));
        }
        
        if (conditionMet && rule.style) {
          // Apply styling
          Object.keys(rule.style).forEach(property => {
            cell.style[property] = rule.style[property];
          });
          
          // Add class if specified
          if (rule.className) {
            cell.classList.add(rule.className);
          }
        }
      }
    }
  }
  
  /**
   * Append data to the table (for infinite scroll/lazy load)
   */
  appendData(data) {
    const tbody = this.tableElement.querySelector('tbody');
    const startIndex = this.loadedRows;
    
    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      const rowIndex = startIndex + index;
      
      // Apply row class name if function provided
      if (typeof this.options.rowClassName === 'function') {
        const className = this.options.rowClassName(row, rowIndex);
        if (className) {
          tr.className = className;
        }
      }
      
      // Store the data row for context menu and events
      tr.dataset.rowIndex = rowIndex;
      tr._data = row;
      
      this.options.columns.forEach((column, colIndex) => {
        const td = document.createElement('td');
        
        // Apply cell class name if function provided
        if (typeof this.options.cellClassName === 'function') {
          const className = this.options.cellClassName(row[column.field], row, column, colIndex);
          if (className) {
            td.className = className;
          }
        }
        
        // Apply column specific class if provided
        if (column.className) {
          td.classList.add(column.className);
        }
        
        if (typeof column.render === 'function') {
          td.innerHTML = column.render(row[column.field], row);
        } else {
          td.textContent = row[column.field] || '';
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
  }
  
  /**
   * Load more data for infinite scroll or lazy loading
   */
  loadMore() {
    if (this.isBusy || !this.hasMoreData) return;
    
    this.isBusy = true;
    
    if (this.options.serverSide) {
      this.loadServerData();
    } else {
      const data = this.options.data || [];
      const nextBatch = data.slice(
        this.loadedRows,
        this.loadedRows + this.options.pageSize
      );
      
      this.appendData(nextBatch);
      this.loadedRows += nextBatch.length;
      this.hasMoreData = this.loadedRows < data.length;
      this.isBusy = false;
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Infinite scroll or lazy loading
    if (this.options.infiniteScroll || this.options.lazyLoad) {
      const tableWrapper = this.tableElement.closest('.advanced-table-wrapper');
      
      const scrollHandler = () => {
        const scrollPosition = tableWrapper.scrollTop + tableWrapper.clientHeight;
        const scrollHeight = tableWrapper.scrollHeight;
        
        if (scrollPosition > scrollHeight - this.options.loadThreshold && this.hasMoreData && !this.isBusy) {
          this.loadMore();
        }
      };
      
      tableWrapper.addEventListener('scroll', scrollHandler);
    }
    
    // Resizable columns
    if (this.options.resizableColumns) {
      const headers = this.tableElement.querySelectorAll('th');
      
      headers.forEach(header => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        header.appendChild(resizer);
        
        let startX, startWidth;
        
        const startResize = (e) => {
          startX = e.pageX;
          startWidth = header.offsetWidth;
          header.classList.add('resizing');
          
          document.addEventListener('mousemove', resize);
          document.addEventListener('mouseup', stopResize);
          e.preventDefault();
        };
        
        const resize = (e) => {
          const width = startWidth + (e.pageX - startX);
          header.style.width = `${width}px`;
        };
        
        const stopResize = () => {
          header.classList.remove('resizing');
          document.removeEventListener('mousemove', resize);
          document.removeEventListener('mouseup', stopResize);
        };
        
        resizer.addEventListener('mousedown', startResize);
      });
    }
    
    // Context menu
    if (this.options.contextMenu) {
      const tableWrapper = this.tableElement.closest('.advanced-table-wrapper');
      
      const contextMenuHandler = (e) => {
        // Find the closest row
        const row = e.target.closest('tr');
        if (!row) return;
        
        // Get row data
        const rowIndex = parseInt(row.getAttribute('data-row-index'), 10);
        if (isNaN(rowIndex)) return;
        
        const rowData = this.options.data[rowIndex];
        if (!rowData) return;
        
        e.preventDefault();
        
        // Position the context menu
        this.showContextMenu(e.clientX, e.clientY, rowData, rowIndex);
      };
      
      tableWrapper.addEventListener('contextmenu', contextMenuHandler);
      
      // Hide context menu on click outside
      document.addEventListener('click', () => {
        this.contextMenuElement.style.display = 'none';
      });
    }
  }
  
  /**
   * Show context menu
   */
  showContextMenu(x, y, rowData, rowIndex) {
    if (!this.contextMenuElement) {
      this.contextMenuElement = document.createElement('div');
      this.contextMenuElement.className = 'advanced-table-context-menu';
      this.contextMenuElement.style.display = 'none';
      document.body.appendChild(this.contextMenuElement);
    }

    // Clear existing menu items
    this.contextMenuElement.innerHTML = '';
    
    // Create menu items
    const menuItems = typeof this.options.contextMenu === 'function' 
      ? this.options.contextMenu(rowData, rowIndex)
      : this.options.contextMenu;
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      
      if (item.divider) {
        menuItem.className += ' divider';
      } else {
        if (item.icon) {
          const iconSpan = document.createElement('span');
          iconSpan.textContent = item.icon + ' ';
          menuItem.appendChild(iconSpan);
        }
        
        const textSpan = document.createElement('span');
        textSpan.textContent = item.text;
        menuItem.appendChild(textSpan);
        
        if (item.className) {
          menuItem.classList.add(item.className);
        }
        
        menuItem.addEventListener('click', (e) => {
          if (typeof item.action === 'function') {
            // Hide menu first
            this.contextMenuElement.style.display = 'none';
            // Call the action with row data and index
            item.action(rowData, rowIndex, e);
          }
        });
      }
      
      this.contextMenuElement.appendChild(menuItem);
    });
    
    // Position the menu
    const menuWidth = 200; // Approximate width, can be adjusted
    const menuHeight = menuItems.length * 35; // Approximate height per item
    
    // Adjust position to keep menu within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let posX = x;
    let posY = y;
    
    if (x + menuWidth > viewportWidth) {
      posX = viewportWidth - menuWidth - 10;
    }
    
    if (y + menuHeight > viewportHeight) {
      posY = viewportHeight - menuHeight - 10;
    }
    
    this.contextMenuElement.style.left = `${posX}px`;
    this.contextMenuElement.style.top = `${posY}px`;
    this.contextMenuElement.style.display = 'block';
  }
  
  /**
   * Sort the table by a column
   */
  sortBy(field) {
    const header = this.tableElement.querySelector(`th[data-field="${field}"]`);
    
    if (!header) return;
    
    // Toggle sort direction
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    // Remove sort indicators from all headers
    this.tableElement.querySelectorAll('th').forEach(th => {
      th.removeAttribute('data-sort-dir');
      th.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    // Set sort indicator on current header
    header.setAttribute('data-sort-dir', this.sortDirection);
    header.classList.add(`sorted-${this.sortDirection}`);
    
    if (this.options.serverSide) {
      // For server-side sorting, reload from server
      this.currentPage = 1;
      this.loadedRows = 0;
      this.loadData();
      return;
    }
    
    // Client-side sorting
    const data = [...this.options.data];
    
    data.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      
      if (valA === valB) return 0;
      
      // Check if values are numbers
      const isNumA = !isNaN(parseFloat(valA));
      const isNumB = !isNaN(parseFloat(valB));
      
      if (isNumA && isNumB) {
        return this.sortDirection === 'asc' 
          ? parseFloat(valA) - parseFloat(valB)
          : parseFloat(valB) - parseFloat(valA);
      }
      
      // Try to parse dates
      const dateA = new Date(valA);
      const dateB = new Date(valB);
      
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return this.sortDirection === 'asc'
          ? dateA - dateB
          : dateB - dateA;
      }
      
      // Default string comparison
      const strA = String(valA || '');
      const strB = String(valB || '');
      
      return this.sortDirection === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
    
    this.options.data = data;
    
    // Reset view state
    if (this.options.infiniteScroll || this.options.lazyLoad) {
      this.loadedRows = 0;
      this.hasMoreData = true;
      this.loadData();
    } else {
      this.currentPage = 1;
      this.loadData();
    }
  }
  
  /**
   * Search the table data
   */
  search(query) {
    if (!query || query.trim() === '') {
      this.options.data = [...this.originalData];
    } else {
      const lowercaseQuery = query.toLowerCase();
      
      this.options.data = this.originalData.filter(row => {
        return this.options.columns.some(column => {
          const value = row[column.field];
          if (value == null) return false;
          
          return String(value).toLowerCase().includes(lowercaseQuery);
        });
      });
    }
    
    // Reset view state
    if (this.options.infiniteScroll || this.options.lazyLoad) {
      this.loadedRows = 0;
      this.hasMoreData = true;
      this.loadData();
    } else {
      this.currentPage = 1;
      this.totalPages = Math.ceil(this.options.data.length / this.options.pageSize);
      this.loadData();
    }
  }
  
  /**
   * Go to the next page
   */
  nextPage() {
    if (this.currentPage < this.totalPages && !this.isBusy) {
      this.currentPage++;
      this.loadData();
    }
  }
  
  /**
   * Go to the previous page
   */
  prevPage() {
    if (this.currentPage > 1 && !this.isBusy) {
      this.currentPage--;
      this.loadData();
    }
  }
  
  /**
   * Go to specific page
   */
  goToPage(page) {
    if (page >= 1 && page <= this.totalPages && !this.isBusy) {
      this.currentPage = page;
      this.loadData();
    }
  }
  
  /**
   * Export table to Excel
   */
  exportToExcel() {
    if (this.options.serverSide && this.totalRecords > this.options.data.length) {
      if (!confirm(`You are about to export only the current page (${this.options.data.length} rows). Do you want to continue?`)) {
        return;
      }
    }
    
    const data = this.getExportData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Table");
    XLSX.writeFile(workbook, "table-export.xlsx");
  }
  
  /**
   * Export table to PDF
   */
  exportToPdf() {
    if (this.options.serverSide && this.totalRecords > this.options.data.length) {
      if (!confirm(`You are about to export only the current page (${this.options.data.length} rows). Do you want to continue?`)) {
        return;
      }
    }
    
    const element = this.tableElement.cloneNode(true);
    
    html2pdf().from(element).save('table-export.pdf');
  }
  
  /**
   * Print table
   */
  print() {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Table</title>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${this.tableElement.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
  
  /**
   * Get data for export
   */
  getExportData() {
    const data = [];
    
    if (this.options.serverSide) {
      // For server-side mode, we may need to fetch all data first
      // This is a simplified implementation that exports only what's loaded
      return this.options.data.map(row => {
        const exportRow = {};
        this.options.columns.forEach(column => {
          exportRow[column.title || column.field] = row[column.field];
        });
        return exportRow;
      });
    }
    
    const sourceData = this.options.infiniteScroll || this.options.lazyLoad
      ? this.originalData
      : this.options.data;
    
    // Transform data for export
    sourceData.forEach(row => {
      const exportRow = {};
      
      this.options.columns.forEach(column => {
        exportRow[column.title || column.field] = row[column.field];
      });
      
      data.push(exportRow);
    });
    
    return data;
  }
  
  /**
   * Refresh the table data
   */
  refresh() {
    if (this.options.infiniteScroll || this.options.lazyLoad) {
      this.loadedRows = 0;
      this.hasMoreData = true;
    } else {
      this.currentPage = 1;
    }
    
    this.loadData();
  }
  
  /**
   * Destroy the table and clean up
   */
  destroy() {
    if (this.tableContainer && this.tableContainer.parentNode) {
      this.tableContainer.parentNode.removeChild(this.tableContainer);
    }
    
    if (this.contextMenuElement && this.contextMenuElement.parentNode) {
      this.contextMenuElement.parentNode.removeChild(this.contextMenuElement);
    }
    
    this.tableElement = null;
    this.tableContainer = null;
    this.paginationElement = null;
    this.toolbarElement = null;
    this.searchElement = null;
    this.contextMenuElement = null;
    
    // Clean up collaboration resources
    this.cleanupCollaboration();
  }
  
  /**
   * Quick static method to create a table from an existing HTML table
   */
  static fromHTML(selector, options = {}) {
    return new Tabelin({
      ...options,
      container: selector,
      useHTML: selector
    });
  }
  
  /**
   * Quick static method to create a table with infinite scroll
   */
  static createInfiniteTable(selector, columns, data, options = {}) {
    return new Tabelin({
      container: selector,
      columns,
      data,
      infiniteScroll: true,
      pageSize: options.batchSize || 20,
      ...options
    });
  }
  
  /**
   * Quick method to create a server-side table
   */
  static createServerTable(selector, columns, serverUrl, options = {}) {
    return new Tabelin({
      container: selector,
      columns,
      serverSide: true,
      serverUrl,
      pageSize: options.pageSize || 20,
      ...options
    });
  }
  
  /**
   * Initialize collaboration features
   */
  initCollaboration() {
    if (!this.options.collaboration) return;
    
    // Set up WebSocket connection
    if (this.options.collaborationMode === 'websocket' && this.options.collaborationUrl) {
      this.initWebSocketConnection();
    } 
    // Set up polling for changes
    else if (this.options.collaborationMode === 'polling' && this.options.collaborationUrl) {
      this.startPollingForChanges();
    }
    
    // Make cells editable for collaboration
    this.makeTableEditable();
  }
  
  /**
   * Initialize WebSocket connection for real-time collaboration
   */
  initWebSocketConnection() {
    try {
      this.collaborationSocket = new WebSocket(this.options.collaborationUrl);
      
      this.collaborationSocket.onopen = () => {
        console.log('Collaboration WebSocket connected');
        // Send initial connection info
        this.collaborationSocket.send(JSON.stringify({
          type: 'connect',
          user: this.options.collaborationUser || {
            id: 'anonymous-' + Math.random().toString(36).substring(2, 9),
            name: 'Anonymous User'
          },
          tableId: this.options.id || 'table-' + Math.random().toString(36).substring(2, 9)
        }));
      };
      
      this.collaborationSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleCollaborationMessage(message);
        } catch (e) {
          console.error('Error processing message:', e);
        }
      };
      
      this.collaborationSocket.onerror = (error) => {
        console.error('Collaboration WebSocket error:', error);
      };
      
      this.collaborationSocket.onclose = () => {
        console.log('Collaboration WebSocket closed');
        // Try to reconnect after a delay
        setTimeout(() => this.initWebSocketConnection(), 5000);
      };
    } catch (e) {
      console.error('Failed to connect to collaboration server:', e);
    }
  }
  
  /**
   * Start polling for changes
   */
  startPollingForChanges() {
    // Clear any existing polling
    if (this.collaborationTimer) {
      clearInterval(this.collaborationTimer);
    }
    
    // Start new polling interval
    this.collaborationTimer = setInterval(() => {
      this.fetchCollaborationChanges();
      this.sendPendingChanges();
    }, this.options.collaborationInterval || 2000);
  }
  
  /**
   * Fetch changes from server
   */
  fetchCollaborationChanges() {
    if (!this.options.collaborationUrl) return;
    
    fetch(this.options.collaborationUrl + '/changes?since=' + (this.lastChangeTimestamp || 0), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.changes && Array.isArray(data.changes)) {
        data.changes.forEach(change => {
          this.handleCollaborationMessage(change);
        });
        
        if (data.timestamp) {
          this.lastChangeTimestamp = data.timestamp;
        }
      }
    })
    .catch(error => {
      console.error('Error fetching collaboration changes:', error);
    });
  }
  
  /**
   * Send pending changes to server
   */
  sendPendingChanges() {
    if (this.pendingChanges.length === 0) return;
    
    const changes = [...this.pendingChanges];
    this.pendingChanges = [];
    
    fetch(this.options.collaborationUrl + '/changes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes: changes,
        user: this.options.collaborationUser || {
          id: 'anonymous-' + Math.random().toString(36).substring(2, 9),
          name: 'Anonymous User'
        },
        tableId: this.options.id || 'table-' + Math.random().toString(36).substring(2, 9)
      })
    })
    .catch(error => {
      console.error('Error sending changes:', error);
      // Push changes back to pending queue
      this.pendingChanges.push(...changes);
    });
  }
  
  /**
   * Handle incoming collaboration message
   */
  handleCollaborationMessage(message) {
    if (!message || !message.type) return;
    
    switch (message.type) {
      case 'cell-change':
        if (message.rowIndex !== undefined && 
            message.columnField !== undefined && 
            message.value !== undefined) {
          this.updateCellFromCollaboration(
            message.rowIndex, 
            message.columnField, 
            message.value,
            message.user
          );
        }
        break;
        
      case 'user-connected':
      case 'user-disconnected':
        // Handle user presence changes
        this.updateCollaboratorPresence(message);
        break;
        
      case 'cursor-position':
        // Show remote user cursor position
        this.updateUserCursor(message);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  /**
   * Update cell value from collaboration event
   */
  updateCellFromCollaboration(rowIndex, columnField, value, user) {
    // Ignore our own messages
    if (user && this.options.collaborationUser && 
        user.id === this.options.collaborationUser.id) {
      return;
    }
    
    // Find column index
    const columnIndex = this.options.columns.findIndex(col => col.field === columnField);
    if (columnIndex === -1) return;
    
    // Update data
    if (this.options.data[rowIndex]) {
      this.options.data[rowIndex][columnField] = value;
      
      // Find cell in DOM and update it
      const tbody = this.tableElement.querySelector('tbody');
      const row = tbody.querySelector(`tr[data-row-index="${rowIndex}"]`);
      
      if (row) {
        const cell = row.querySelectorAll('td')[columnIndex];
        
        if (cell) {
          // Check if the cell has custom rendering
          const column = this.options.columns[columnIndex];
          if (column && typeof column.render === 'function') {
            cell.innerHTML = column.render(value, this.options.data[rowIndex]);
          } else {
            cell.textContent = value;
          }
          
          // Add highlight effect to show change
          cell.classList.add('cell-changed');
          setTimeout(() => {
            cell.classList.remove('cell-changed');
          }, 2000);
          
          // Show tooltip with user info if provided
          if (user && user.name) {
            const tooltip = document.createElement('div');
            tooltip.className = 'collaboration-tooltip';
            tooltip.textContent = `Changed by ${user.name}`;
            
            if (user.color) {
              tooltip.style.backgroundColor = user.color;
            }
            
            cell.appendChild(tooltip);
            
            setTimeout(() => {
              tooltip.remove();
            }, 3000);
          }
        }
      }
      
      // Add to version history if enabled
      if (this.options.versionHistory) {
        this.addToVersionHistory(rowIndex, columnField, value, user);
      }
    }
  }
  
  /**
   * Make table cells editable for collaboration
   */
  makeTableEditable() {
    // Add event listener to table body
    const tbody = this.tableElement.querySelector('tbody');
    
    tbody.addEventListener('dblclick', (event) => {
      const cell = event.target.closest('td');
      if (!cell) return;
      
      const row = cell.closest('tr');
      const rowIndex = parseInt(row.dataset.rowIndex, 10);
      
      // Find column index and field
      const columnIndex = Array.from(row.cells).indexOf(cell);
      const column = this.options.columns[columnIndex];
      
      if (!column || !this.options.data[rowIndex]) return;
      
      // Check if column is editable
      const isEditable = column.editable !== false; // editable by default
      if (!isEditable) return;
      
      // Get current value
      const value = this.options.data[rowIndex][column.field];
      
      // Create input for editing
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';
      input.className = 'cell-edit-input';
      
      // Save original content
      const originalContent = cell.innerHTML;
      
      // Replace content with input
      cell.innerHTML = '';
      cell.appendChild(input);
      input.focus();
      input.select();
      
      // Handle input blur and key events
      const saveEdit = () => {
        const newValue = input.value;
        
        // If value hasn't changed, just restore the original content
        if (newValue === value) {
          cell.innerHTML = originalContent;
          return;
        }
        
        // Update data
        this.options.data[rowIndex][column.field] = newValue;
        
        // Check if the cell has custom rendering
        if (typeof column.render === 'function') {
          cell.innerHTML = column.render(newValue, this.options.data[rowIndex]);
        } else {
          cell.textContent = newValue;
        }
        
        // Send change to collaboration system
        this.sendCellChange(rowIndex, column.field, newValue);
        
        // Add to version history if enabled
        if (this.options.versionHistory) {
          this.addToVersionHistory(
            rowIndex, 
            column.field, 
            newValue, 
            this.options.collaborationUser || { name: 'Local User' }
          );
        }
      };
      
      input.addEventListener('blur', saveEdit);
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveEdit();
          e.preventDefault();
        } else if (e.key === 'Escape') {
          cell.innerHTML = originalContent;
          e.preventDefault();
        }
      });
    });
  }
  
  /**
   * Send cell change to collaboration system
   */
  sendCellChange(rowIndex, columnField, value) {
    const change = {
      type: 'cell-change',
      rowIndex: rowIndex,
      columnField: columnField,
      value: value,
      user: this.options.collaborationUser || { name: 'Local User' },
      timestamp: Date.now()
    };
    
    // If using WebSocket, send immediately
    if (this.options.collaborationMode === 'websocket' && 
        this.collaborationSocket && 
        this.collaborationSocket.readyState === WebSocket.OPEN) {
      
      this.collaborationSocket.send(JSON.stringify(change));
    } 
    // Otherwise, add to pending changes
    else {
      this.pendingChanges.push(change);
    }
  }
  
  /**
   * Add cell change to version history
   */
  addToVersionHistory(rowIndex, columnField, value, user) {
    if (!this.options.versionHistory) return;
    
    // Create unique key for the cell
    const cellKey = `${rowIndex}:${columnField}`;
    
    // Get or initialize version history for this cell
    if (!this.cellVersions.has(cellKey)) {
      this.cellVersions.set(cellKey, []);
    }
    
    const versions = this.cellVersions.get(cellKey);
    
    // Add new version
    versions.push({
      value: value,
      timestamp: Date.now(),
      user: user || { name: 'Unknown User' }
    });
    
    // Limit versions count
    if (versions.length > this.options.maxVersions) {
      versions.shift(); // Remove oldest version
    }
  }
  
  /**
   * Get version history for a cell
   */
  getCellVersionHistory(rowIndex, columnField) {
    const cellKey = `${rowIndex}:${columnField}`;
    return this.cellVersions.get(cellKey) || [];
  }
  
  /**
   * Show version history for a cell
   */
  showVersionHistory(rowIndex, columnField) {
    const versions = this.getCellVersionHistory(rowIndex, columnField);
    
    if (!versions || versions.length === 0) {
      alert('No version history available for this cell.');
      return;
    }
    
    // Create version history dialog
    const dialog = document.createElement('div');
    dialog.className = 'version-history-dialog';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'version-history-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Version History';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'version-history-close';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'version-history-content';
    
    // Create version list
    const versionList = document.createElement('ul');
    versionList.className = 'version-history-list';
    
    // Sort versions by timestamp (newest first)
    versions.sort((a, b) => b.timestamp - a.timestamp);
    
    versions.forEach((version, index) => {
      const item = document.createElement('li');
      item.className = 'version-history-item';
      
      const date = new Date(version.timestamp);
      const timeString = date.toLocaleString();
      
      item.innerHTML = `
        <div class="version-history-item-header">
          <span class="version-number">v${versions.length - index}</span>
          <span class="version-user">${version.user.name || 'Unknown'}</span>
          <span class="version-time">${timeString}</span>
        </div>
        <div class="version-content">${version.value}</div>
      `;
      
      // Add restore button for all except the latest version
      if (index > 0) {
        const restoreButton = document.createElement('button');
        restoreButton.textContent = 'Restore';
        restoreButton.className = 'version-restore-btn';
        restoreButton.addEventListener('click', () => {
          if (confirm('Are you sure you want to restore this version?')) {
            this.restoreVersion(rowIndex, columnField, version.value);
            document.body.removeChild(dialog);
          }
        });
        
        item.appendChild(restoreButton);
      } else {
        item.classList.add('current-version');
      }
      
      versionList.appendChild(item);
    });
    
    content.appendChild(versionList);
    
    dialog.appendChild(header);
    dialog.appendChild(content);
    
    document.body.appendChild(dialog);
  }
  
  /**
   * Restore a previous version of a cell
   */
  restoreVersion(rowIndex, columnField, value) {
    // Update data
    if (this.options.data[rowIndex]) {
      this.options.data[rowIndex][columnField] = value;
      
      // Find column index
      const columnIndex = this.options.columns.findIndex(col => col.field === columnField);
      if (columnIndex === -1) return;
      
      // Update UI
      const tbody = this.tableElement.querySelector('tbody');
      const row = tbody.querySelector(`tr[data-row-index="${rowIndex}"]`);
      
      if (row) {
        const cell = row.querySelectorAll('td')[columnIndex];
        
        if (cell) {
          const column = this.options.columns[columnIndex];
          if (column && typeof column.render === 'function') {
            cell.innerHTML = column.render(value, this.options.data[rowIndex]);
          } else {
            cell.textContent = value;
          }
          
          // Add restore highlight effect
          cell.classList.add('cell-restored');
          setTimeout(() => {
            cell.classList.remove('cell-restored');
          }, 2000);
        }
      }
      
      // Send change to collaboration system
      this.sendCellChange(rowIndex, columnField, value);
      
      // Add to version history
      this.addToVersionHistory(
        rowIndex, 
        columnField, 
        value, 
        { 
          name: this.options.collaborationUser?.name + ' (restored)',
          id: this.options.collaborationUser?.id 
        }
      );
    }
  }
  
  /**
   * Update user presence/cursor in the table
   */
  updateUserCursor(message) {
    if (!message.user || !message.position) return;
    
    // Remove any existing cursor for this user
    const existingCursor = document.querySelector(`.user-cursor[data-user-id="${message.user.id}"]`);
    if (existingCursor) {
      existingCursor.remove();
    }
    
    // Create a new cursor element
    const cursor = document.createElement('div');
    cursor.className = 'user-cursor';
    cursor.dataset.userId = message.user.id;
    
    if (message.user.color) {
      cursor.style.backgroundColor = message.user.color;
    }
    
    const userLabel = document.createElement('div');
    userLabel.className = 'user-cursor-label';
    userLabel.textContent = message.user.name || 'Anonymous';
    
    if (message.user.color) {
      userLabel.style.backgroundColor = message.user.color;
    }
    
    cursor.appendChild(userLabel);
    
    // Position the cursor
    const { rowIndex, columnIndex } = message.position;
    
    // Find the cell
    const tbody = this.tableElement.querySelector('tbody');
    const row = tbody.querySelector(`tr[data-row-index="${rowIndex}"]`);
    
    if (row) {
      const cell = row.querySelectorAll('td')[columnIndex];
      
      if (cell) {
        // Position cursor at the cell
        cell.appendChild(cursor);
        
        // Automatically remove cursor after some time
        setTimeout(() => {
          if (cursor.parentNode) {
            cursor.remove();
          }
        }, 5000);
      }
    }
  }
  
  /**
   * Update collaborator presence
   */
  updateCollaboratorPresence(message) {
    const { type, user } = message;
    
    if (!this.collaboratorsContainer) {
      // Create collaborators container if it doesn't exist
      this.collaboratorsContainer = document.createElement('div');
      this.collaboratorsContainer.className = 'collaborators-container';
      this.tableContainer.appendChild(this.collaboratorsContainer);
    }
    
    if (type === 'user-connected') {
      // Add user to collaborators list
      let userElement = this.collaboratorsContainer.querySelector(`.collaborator[data-user-id="${user.id}"]`);
      
      if (!userElement) {
        userElement = document.createElement('div');
        userElement.className = 'collaborator';
        userElement.dataset.userId = user.id;
        
        const avatar = document.createElement('div');
        avatar.className = 'collaborator-avatar';
        avatar.textContent = user.name.substring(0, 1).toUpperCase();
        
        if (user.color) {
          avatar.style.backgroundColor = user.color;
        }
        
        const name = document.createElement('div');
        name.className = 'collaborator-name';
        name.textContent = user.name;
        
        userElement.appendChild(avatar);
        userElement.appendChild(name);
        
        this.collaboratorsContainer.appendChild(userElement);
      }
    } else if (type === 'user-disconnected') {
      // Remove user from collaborators list
      const userElement = this.collaboratorsContainer.querySelector(`.collaborator[data-user-id="${user.id}"]`);
      
      if (userElement) {
        userElement.classList.add('disconnected');
        
        setTimeout(() => {
          if (userElement.parentNode) {
            userElement.remove();
          }
        }, 5000);
      }
    }
  }
  
  /**
   * Update cursor position during collaboration
   */
  sendCursorPosition(rowIndex, columnIndex) {
    if (!this.options.collaboration || 
        !this.options.collaborationUser ||
        (this.options.collaborationMode === 'websocket' && 
        (!this.collaborationSocket || this.collaborationSocket.readyState !== WebSocket.OPEN))) {
      return;
    }
    
    const message = {
      type: 'cursor-position',
      position: { rowIndex, columnIndex },
      user: this.options.collaborationUser,
      timestamp: Date.now()
    };
    
    // Send cursor position update
    if (this.options.collaborationMode === 'websocket') {
      this.collaborationSocket.send(JSON.stringify(message));
    } else {
      this.pendingChanges.push(message);
    }
  }
  
  /**
   * Clean up collaboration resources
   */
  cleanupCollaboration() {
    if (this.collaborationSocket) {
      this.collaborationSocket.close();
      this.collaborationSocket = null;
    }
    
    if (this.collaborationTimer) {
      clearInterval(this.collaborationTimer);
      this.collaborationTimer = null;
    }
  }
  
  /**
   * Initialize data visualization features
   */
  initVisualizations() {
    // Add a button to the toolbar to toggle visualizations
    const toggleVisBtn = document.createElement('button');
    toggleVisBtn.textContent = 'Toggle Visualizations';
    toggleVisBtn.className = 'visualizations-btn';
    toggleVisBtn.addEventListener('click', () => this.toggleVisualizations());
    
    this.toolbarElement.querySelector('.export-buttons').appendChild(toggleVisBtn);
    
    // Add visualization mode selector
    const visModeContainer = document.createElement('div');
    visModeContainer.className = 'visualization-mode-container';
    visModeContainer.style.display = 'none';
    
    const visModeLabel = document.createElement('span');
    visModeLabel.textContent = 'Visualization Mode: ';
    
    const visModeSelector = document.createElement('select');
    visModeSelector.className = 'vis-mode-selector';
    
    ['cell', 'row', 'column', 'summary'].forEach(mode => {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
      option.selected = this.options.visualizationPosition === mode;
      visModeSelector.appendChild(option);
    });
    
    visModeSelector.addEventListener('change', (e) => {
      this.options.visualizationPosition = e.target.value;
      this.renderVisualizations();
    });
    
    visModeContainer.appendChild(visModeLabel);
    visModeContainer.appendChild(visModeSelector);
    this.toolbarElement.appendChild(visModeContainer);
    
    // Store reference to the visualization mode container
    this.visModeContainer = visModeContainer;
  }
  
  /**
   * Toggle data visualizations
   */
  toggleVisualizations() {
    const isActive = this.tableContainer.classList.toggle('show-visualizations');
    
    if (isActive) {
      this.renderVisualizations();
      this.visModeContainer.style.display = 'flex';
    } else {
      this.clearVisualizations();
      this.visModeContainer.style.display = 'none';
    }
  }
  
  /**
   * Render data visualizations
   */
  renderVisualizations() {
    // Clear any existing visualizations
    this.clearVisualizations();
    
    // Different visualization approaches based on position setting
    switch (this.options.visualizationPosition) {
      case 'cell':
        this.renderCellVisualizations();
        break;
      case 'row':
        this.renderRowVisualizations();
        break;
      case 'column':
        this.renderColumnVisualizations();
        break;
      case 'summary':
        this.renderSummaryVisualizations();
        break;
    }
  }
  
  /**
   * Clear all visualizations
   */
  clearVisualizations() {
    // Remove all visualization elements
    this.tableContainer.querySelectorAll('.visualization').forEach(el => el.remove());
    
    // Remove all visualization classes from cells
    this.tableElement.querySelectorAll('td.has-visualization').forEach(td => {
      td.classList.remove('has-visualization');
    });
    
    // Clear summary visualizations
    if (this.summaryVisualizationsElement) {
      this.summaryVisualizationsElement.innerHTML = '';
    }
  }
  
  /**
   * Render visualizations inside cells
   */
  renderCellVisualizations() {
    // Only visualize numeric data in cells
    this.tableElement.querySelectorAll('tbody tr').forEach(row => {
      const rowData = row._data;
      
      if (!rowData) return;
      
      // Process each cell
      this.options.columns.forEach((column, columnIndex) => {
        const value = rowData[column.field];
        if (value !== null && value !== undefined && !isNaN(parseFloat(value))) {
          const numericValue = parseFloat(value);
          const cell = row.querySelectorAll('td')[columnIndex];
          
          if (!cell) return;
          
          // Check if we should add visualization (for numbers)
          if (column.visualization !== false) {
            this.addCellVisualization(cell, numericValue, column);
          }
        }
      });
    });
  }
  
  /**
   * Add visualization to a single cell
   */
  addCellVisualization(cell, value, column) {
    // Determine the type of visualization to use
    let visType = column.visualizationType || this.options.visualizationTypes[0];
    
    // Check if valid vis type
    if (!this.options.visualizationTypes.includes(visType)) {
      visType = 'bar';
    }
    
    // Preserve original cell content
    const originalContent = cell.innerHTML;
    const cellWidth = cell.offsetWidth;
    const cellHeight = cell.offsetHeight;
    
    // Add visualization class
    cell.classList.add('has-visualization');
    
    // Find column min/max for scaling
    let columnValues = [];
    this.tableElement.querySelectorAll('tbody tr').forEach(row => {
      const rowData = row._data;
      if (rowData) {
        const cellValue = rowData[column.field];
        if (cellValue !== null && cellValue !== undefined && !isNaN(parseFloat(cellValue))) {
          columnValues.push(parseFloat(cellValue));
        }
      }
    });
    
    const minValue = Math.min(...columnValues);
    const maxValue = Math.max(...columnValues);
    
    let visualization;
    
    // Create visualization based on type
    switch (visType) {
      case 'bar':
        visualization = this.createBarVisualization(value, minValue, maxValue);
        break;
      case 'progress':
        visualization = this.createProgressVisualization(value, 0, 100);
        break;
      case 'sparkline':
        visualization = this.createSparklineVisualization(column.field);
        break;
      case 'pie':
        visualization = this.createPieVisualization(value, 100);
        break;
    }
    
    if (visualization) {
      visualization.style.bottom = '0';
      visualization.style.left = '0';
      visualization.style.right = '0';
      visualization.style.pointerEvents = 'none';
      visualization.style.opacity = '0.7';
      
      // Adjust cell for visualization
      cell.style.position = 'relative';
      
      // Add visualization to cell
      cell.appendChild(visualization);
    }
  }
  
  /**
   * Create a bar visualization
   */
  createBarVisualization(value, min, max) {
    const container = document.createElement('div');
    container.className = 'visualization bar-visualization';
    
    // Calculate percentage
    const range = max - min;
    const percentage = range === 0 ? 50 : ((value - min) / range) * 100;
    
    // Create bar element
    const bar = document.createElement('div');
    bar.className = 'vis-bar';
    bar.style.width = `${percentage}%`;
    bar.style.backgroundColor = this.getColorForValue(percentage);
    bar.style.height = '4px';
    
    container.appendChild(bar);
    return container;
  }
  
  /**
   * Create a progress visualization
   */
  createProgressVisualization(value, min, max) {
    const container = document.createElement('div');
    container.className = 'visualization progress-visualization';
    
    // Calculate percentage (clamp between 0-100)
    const percentage = Math.min(100, Math.max(0, value));
    
    // Create progress bar
    const progress = document.createElement('div');
    progress.className = 'vis-progress';
    progress.style.width = `${percentage}%`;
    progress.style.height = '4px';
    progress.style.backgroundColor = this.getColorForValue(percentage);
    
    container.appendChild(progress);
    return container;
  }
  
  /**
   * Create a sparkline visualization
   */
  createSparklineVisualization(field) {
    const container = document.createElement('div');
    container.className = 'visualization sparkline-visualization';
    
    // Get data for this field across all visible rows
    const values = [];
    this.tableElement.querySelectorAll('tbody tr').forEach(row => {
      const rowData = row._data;
      if (rowData && rowData[field] !== undefined && !isNaN(parseFloat(rowData[field]))) {
        values.push(parseFloat(rowData[field]));
      }
    });
    
    if (values.length < 2) {
      return container; // Not enough data for sparkline
    }
    
    // Normalize values to fit in container
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Create SVG for sparkline
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', `0 0 ${values.length} 100`);
    svg.style.display = 'block';
    
    // Create sparkline path
    let pathD = '';
    values.forEach((value, i) => {
      const x = i;
      const y = range === 0 ? 50 : 100 - ((value - min) / range * 100);
      
      if (i === 0) {
        pathD += `M ${x},${y}`;
      } else {
        pathD += ` L ${x},${y}`;
      }
    });
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', '#2196F3');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    
    svg.appendChild(path);
    container.appendChild(svg);
    
    return container;
  }
  
  /**
   * Create a pie visualization
   */
  createPieVisualization(value, total) {
    const container = document.createElement('div');
    container.className = 'visualization pie-visualization';
    
    // Calculate percentage
    const percentage = (value / total) * 100;
    
    // Create SVG for pie chart
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 100 100');
    
    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '50');
    bgCircle.setAttribute('cy', '50');
    bgCircle.setAttribute('r', '40');
    bgCircle.setAttribute('fill', '#e0e0e0');
    
    svg.appendChild(bgCircle);
    
    // Calculate the arc path for the value
    const startX = 50;
    const startY = 10;
    const endAngle = 2 * Math.PI * (percentage / 100);
    const endX = 50 + 40 * Math.sin(endAngle);
    const endY = 50 - 40 * Math.cos(endAngle);
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`);
    path.setAttribute('fill', this.getColorForValue(percentage));
    
    svg.appendChild(path);
    container.appendChild(svg);
    
    return container;
  }
  
  /**
   * Render visualizations for entire rows
   */
  renderRowVisualizations() {
    // Create a chart for each row that visualizes all its numeric values
    this.tableElement.querySelectorAll('tbody tr').forEach(row => {
      const rowData = row._data;
      if (!rowData) return;
      
      // Get numeric data from this row
      const labels = [];
      const values = [];
      
      this.options.columns.forEach(column => {
        const value = rowData[column.field];
        if (value !== null && value !== undefined && !isNaN(parseFloat(value))) {
          labels.push(column.title || column.field);
          values.push(parseFloat(value));
        }
      });
      
      if (values.length < 2) return; // Not enough data to visualize
      
      // Create a visualization container
      const container = document.createElement('div');
      container.className = 'visualization row-visualization';
      
      // Create horizontal bar chart for the row
      const chart = this.createHorizontalBarChart(labels, values);
      container.appendChild(chart);
      
      // Add the visualization after the row
      const nextRow = row.nextElementSibling;
      if (nextRow) {
        nextRow.parentNode.insertBefore(container, nextRow);
      } else {
        row.parentNode.appendChild(container);
      }
    });
  }
  
  /**
   * Create a horizontal bar chart
   */
  createHorizontalBarChart(labels, values) {
    const container = document.createElement('div');
    container.className = 'horizontal-bar-chart';
    container.style.width = '100%';
    container.style.padding = '10px';
    container.style.boxSizing = 'border-box';
    
    // Find max value for scaling
    const maxValue = Math.max(...values);
    
    // Create bars
    labels.forEach((label, i) => {
      const barContainer = document.createElement('div');
      barContainer.className = 'bar-container';
      barContainer.style.display = 'flex';
      barContainer.style.alignItems = 'center';
      barContainer.style.marginBottom = '5px';
      
      const labelElem = document.createElement('div');
      labelElem.className = 'bar-label';
      labelElem.textContent = label;
      labelElem.style.width = '100px';
      labelElem.style.overflow = 'hidden';
      labelElem.style.textOverflow = 'ellipsis';
      labelElem.style.whiteSpace = 'nowrap';
      labelElem.style.marginRight = '10px';
      
      const barWrapper = document.createElement('div');
      barWrapper.className = 'bar-wrapper';
      barWrapper.style.flex = '1';
      barWrapper.style.height = '20px';
      barWrapper.style.backgroundColor = '#f5f5f5';
      barWrapper.style.borderRadius = '4px';
      barWrapper.style.overflow = 'hidden';
      
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = '100%';
      bar.style.width = `${(values[i] / maxValue) * 100}%`;
      bar.style.backgroundColor = this.getColorForIndex(i);
      
      const valueElem = document.createElement('div');
      valueElem.className = 'bar-value';
      valueElem.textContent = values[i].toLocaleString();
      valueElem.style.marginLeft = '5px';
      valueElem.style.fontSize = '12px';
      
      barWrapper.appendChild(bar);
      barContainer.appendChild(labelElem);
      barContainer.appendChild(barWrapper);
      barContainer.appendChild(valueElem);
      container.appendChild(barContainer);
    });
    
    return container;
  }
  
  /**
   * Render visualizations for columns
   */
  renderColumnVisualizations() {
    // Find columns with numeric data
    const numericColumns = [];
    
    this.options.columns.forEach((column, index) => {
      let numericCount = 0;
      
      // Count numeric values in the column
      this.tableElement.querySelectorAll('tbody tr').forEach(row => {
        const rowData = row._data;
        if (rowData && rowData[column.field] !== undefined && !isNaN(parseFloat(rowData[column.field]))) {
          numericCount++;
        }
      });
      
      if (numericCount >= this.options.visualizationThreshold) {
        numericColumns.push({ column, index });
      }
    });
    
    // For each numeric column, add a visualization
    numericColumns.forEach(({ column, index }) => {
      this.createColumnVisualization(column, index);
    });
  }
  
  /**
   * Create visualization for a column
   */
  createColumnVisualization(column, columnIndex) {
    // Collect all numeric values for this column
    const values = [];
    
    this.tableElement.querySelectorAll('tbody tr').forEach(row => {
      const rowData = row._data;
      if (rowData && rowData[column.field] !== undefined && !isNaN(parseFloat(rowData[column.field]))) {
        values.push(parseFloat(rowData[column.field]));
      }
    });
    
    if (values.length === 0) return;
    
    // Calculate statistics
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    
    // Create visualization container
    const visContainer = document.createElement('div');
    visContainer.className = 'visualization column-visualization';
    visContainer.style.position = 'absolute';
    visContainer.style.top = '-40px';
    visContainer.style.left = '0';
    visContainer.style.right = '0';
    visContainer.style.height = '40px';
    visContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    visContainer.style.borderBottom = '1px solid #ddd';
    visContainer.style.display = 'flex';
    visContainer.style.alignItems = 'center';
    visContainer.style.justifyContent = 'center';
    visContainer.style.fontSize = '12px';
    
    // Create sparkline
    const sparklineContainer = document.createElement('div');
    sparklineContainer.style.width = '80px';
    sparklineContainer.style.height = '30px';
    sparklineContainer.style.marginRight = '10px';
    
    // Create SVG for sparkline
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '80');
    svg.setAttribute('height', '30');
    svg.setAttribute('viewBox', `0 0 ${values.length} 100`);
    
    // Create sparkline path
    let pathD = '';
    values.forEach((value, i) => {
      const x = i * (80 / values.length);
      const y = 30 - ((value - min) / (max - min) * 30);
      
      if (i === 0) {
        pathD += `M ${x},${y}`;
      } else {
        pathD += ` L ${x},${y}`;
      }
    });
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', '#2196F3');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    
    svg.appendChild(path);
    sparklineContainer.appendChild(svg);
    
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.style.display = 'flex';
    statsContainer.style.flexDirection = 'column';
    statsContainer.style.fontSize = '10px';
    statsContainer.style.textAlign = 'left';
    
    const avgElem = document.createElement('div');
    avgElem.textContent = `Avg: ${avg.toFixed(2)}`;
    
    const rangeElem = document.createElement('div');
    rangeElem.textContent = `Range: ${min.toFixed(2)} - ${max.toFixed(2)}`;
    
    statsContainer.appendChild(avgElem);
    statsContainer.appendChild(rangeElem);
    
    visContainer.appendChild(sparklineContainer);
    visContainer.appendChild(statsContainer);
    
    // Add visualization to header
    const header = this.tableElement.querySelector(`th:nth-child(${columnIndex + 1})`);
    if (header) {
      header.style.position = 'relative';
      header.appendChild(visContainer);
    }
  }
  
  /**
   * Render summary visualizations for the entire table
   */
  renderSummaryVisualizations() {
    // Create a container for the visualizations
    if (!this.summaryVisualizationsElement) {
      this.summaryVisualizationsElement = document.createElement('div');
      this.summaryVisualizationsElement.className = 'summary-visualizations';
      this.summaryVisualizationsElement.style.padding = '20px';
      this.summaryVisualizationsElement.style.backgroundColor = '#fff';
      this.summaryVisualizationsElement.style.border = '1px solid #ddd';
      this.summaryVisualizationsElement.style.borderRadius = '4px';
      this.summaryVisualizationsElement.style.marginTop = '20px';
      
      this.tableContainer.appendChild(this.summaryVisualizationsElement);
    } else {
      this.summaryVisualizationsElement.innerHTML = '';
    }
    
    // Find numeric columns
    const numericColumns = this.options.columns.filter(column => {
      let hasNumericValues = false;
      for (const row of this.originalData) {
        if (row[column.field] !== undefined && !isNaN(parseFloat(row[column.field]))) {
          hasNumericValues = true;
          break;
        }
      }
      return hasNumericValues;
    });
    
    if (numericColumns.length === 0) {
      this.summaryVisualizationsElement.textContent = 'No numeric data to visualize';
      return;
    }
    
    // Create a title
    const title = document.createElement('h3');
    title.textContent = 'Data Visualizations';
    title.style.margin = '0 0 20px 0';
    
    this.summaryVisualizationsElement.appendChild(title);
    
    // Create tabs for different types of visualizations
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tabs-container';
    tabContainer.style.marginBottom = '20px';
    
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    
    const tabs = ['Bar Chart', 'Line Chart', 'Distribution'];
    
    const tabButtons = tabs.map((tabName, index) => {
      const button = document.createElement('button');
      button.textContent = tabName;
      button.className = index === 0 ? 'active' : '';
      button.style.padding = '10px 15px';
      button.style.border = '1px solid #ddd';
      button.style.borderBottom = 'none';
      button.style.backgroundColor = index === 0 ? '#fff' : '#f5f5f5';
      button.style.borderRadius = '4px 4px 0 0';
      button.style.marginRight = '5px';
      button.style.cursor = 'pointer';
      
      button.addEventListener('click', () => {
        // Deactivate all tabs
        tabButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.style.backgroundColor = '#f5f5f5';
        });
        
        // Activate clicked tab
        button.classList.add('active');
        button.style.backgroundColor = '#fff';
        
        // Show corresponding content
        this.showTabContent(tabName, numericColumns);
      });
      
      return button;
    });
    
    tabButtons.forEach(button => tabContainer.appendChild(button));
    
    this.summaryVisualizationsElement.appendChild(tabContainer);
    this.summaryVisualizationsElement.appendChild(tabContent);
    
    // Show initial tab content
    this.showTabContent('Bar Chart', numericColumns);
  }
  
  /**
   * Show specific tab content in summary visualizations
   */
  showTabContent(tabName, numericColumns) {
    const tabContent = this.summaryVisualizationsElement.querySelector('.tab-content');
    tabContent.innerHTML = '';
    
    switch (tabName) {
      case 'Bar Chart':
        this.createSummaryBarChart(tabContent, numericColumns);
        break;
      case 'Line Chart':
        this.createSummaryLineChart(tabContent, numericColumns);
        break;
      case 'Distribution':
        this.createSummaryDistribution(tabContent, numericColumns);
        break;
    }
  }
  
  /**
   * Create a bar chart for the summary visualization
   */
  createSummaryBarChart(container, numericColumns) {
    // If more than one column, create a dropdown to select the column
    const columnSelectContainer = document.createElement('div');
    columnSelectContainer.style.marginBottom = '20px';
    
    const columnSelect = document.createElement('select');
    columnSelect.className = 'column-select';
    
    numericColumns.forEach((column, index) => {
      const option = document.createElement('option');
      option.value = column.field;
      option.textContent = column.title || column.field;
      option.selected = index === 0;
      columnSelect.appendChild(option);
    });
    
    columnSelectContainer.appendChild(columnSelect);
    container.appendChild(columnSelectContainer);
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'bar-chart-container';
    chartContainer.style.height = '300px';
    chartContainer.style.width = '100%';
    chartContainer.style.overflowX = 'auto';
    chartContainer.style.overflowY = 'hidden';
    
    container.appendChild(chartContainer);
    
    // Function to create the bar chart
    const createChart = (field) => {
      chartContainer.innerHTML = '';
      
      // Collect data for the selected column
      const dataPoints = this.originalData
        .filter(row => row[field] !== undefined && !isNaN(parseFloat(row[field])))
        .map(row => ({
          label: row[this.options.columns[0].field] || '',
          value: parseFloat(row[field])
        }))
        .sort((a, b) => b.value - a.value) // Sort by value descending
        .slice(0, 20); // Limit to top 20
      
      if (dataPoints.length === 0) {
        chartContainer.textContent = 'No numeric data to display';
        return;
      }
      
      // Find max value for scaling
      const maxValue = Math.max(...dataPoints.map(dp => dp.value));
      
      // Create SVG for the chart
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '300');
      svg.style.display = 'block';
      
      // Add horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = 250 - (i * 250 / 4);
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', '40');
        gridLine.setAttribute('y1', y);
        gridLine.setAttribute('x2', '100%');
        gridLine.setAttribute('y2', y);
        gridLine.setAttribute('stroke', '#e0e0e0');
        gridLine.setAttribute('stroke-width', '1');
        svg.appendChild(gridLine);
      }
      
      // Calculate bar width
      const barWidth = Math.min(40, (chartContainer.offsetWidth - 50) / dataPoints.length - 10);
      
      // Draw bars
      dataPoints.forEach((dataPoint, i) => {
        const x = 40 + (i * ((chartContainer.offsetWidth - 50) / dataPoints.length));
        const height = (dataPoint.value / maxValue) * 250;
        const y = 250 - height;
        
        // Create bar
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', this.getColorForIndex(i));
        
        // Add value text
        const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueText.setAttribute('x', x + barWidth / 2);
        valueText.setAttribute('y', y - 5);
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('font-size', '12');
        valueText.textContent = dataPoint.value.toLocaleString();
        
        // Add label text
        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.setAttribute('x', x + barWidth / 2);
        labelText.setAttribute('y', 295);
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('font-size', '10');
        labelText.setAttribute('transform', `rotate(45, ${x + barWidth / 2}, 295)`);
        labelText.textContent = dataPoint.label.toString().substring(0, 15);
        
        svg.appendChild(rect);
        svg.appendChild(valueText);
        svg.appendChild(labelText);
      });
      
      chartContainer.appendChild(svg);
    };
    
    // Initial chart creation
    createChart(columnSelect.value);
    
    // Update chart when column selection changes
    columnSelect.addEventListener('change', (e) => {
      createChart(e.target.value);
    });
  }
  
  /**
   * Create a line chart for the summary visualization
   */
  createSummaryLineChart(container, numericColumns) {
    // Create column selection checkboxes
    const columnSelectContainer = document.createElement('div');
    columnSelectContainer.style.marginBottom = '20px';
    columnSelectContainer.style.display = 'flex';
    columnSelectContainer.style.flexWrap = 'wrap';
    columnSelectContainer.style.gap = '10px';
    
    const selectedColumns = [];
    
    numericColumns.forEach((column, index) => {
      const checkboxContainer = document.createElement('label');
      checkboxContainer.style.display = 'flex';
      checkboxContainer.style.alignItems = 'center';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = column.field;
      checkbox.checked = index < 3; // Select first 3 by default
      
      if (checkbox.checked) {
        selectedColumns.push(column.field);
      }
      
      const colorIndicator = document.createElement('span');
      colorIndicator.style.display = 'inline-block';
      colorIndicator.style.width = '12px';
      colorIndicator.style.height = '12px';
      colorIndicator.style.backgroundColor = this.getColorForIndex(index);
      colorIndicator.style.marginRight = '5px';
      colorIndicator.style.marginLeft = '5px';
      
      const label = document.createElement('span');
      label.textContent = column.title || column.field;
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedColumns.push(column.field);
        } else {
          const index = selectedColumns.indexOf(column.field);
          if (index !== -1) {
            selectedColumns.splice(index, 1);
          }
        }
        
        updateChart();
      });
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(colorIndicator);
      checkboxContainer.appendChild(label);
      columnSelectContainer.appendChild(checkboxContainer);
    });
    
    container.appendChild(columnSelectContainer);
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'line-chart-container';
    chartContainer.style.height = '300px';
    chartContainer.style.width = '100%';
    
    container.appendChild(chartContainer);
    
    // Function to update the chart
    const updateChart = () => {
      chartContainer.innerHTML = '';
      
      if (selectedColumns.length === 0) {
        chartContainer.textContent = 'Select at least one column to display';
        return;
      }
      
      // Collect data for each selected column
      const dataSeriesList = [];
      
      selectedColumns.forEach(field => {
        const dataSeries = this.originalData
          .filter(row => row[field] !== undefined && !isNaN(parseFloat(row[field])))
          .map((row, index) => ({
            x: index,
            y: parseFloat(row[field])
          }));
          
        dataSeriesList.push({
          field,
          data: dataSeries
        });
      });
      
      // Find overall min and max values
      let allValues = [];
      dataSeriesList.forEach(series => {
        allValues = allValues.concat(series.data.map(d => d.y));
      });
      
      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);
      
      // Create SVG for the chart
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '300');
      svg.style.display = 'block';
      
      // Add a grid
      for (let i = 0; i <= 4; i++) {
        const y = 250 - (i * 250 / 4);
        
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', '40');
        gridLine.setAttribute('y1', y);
        gridLine.setAttribute('x2', '100%');
        gridLine.setAttribute('y2', y);
        gridLine.setAttribute('stroke', '#e0e0e0');
        gridLine.setAttribute('stroke-width', '1');
        
        svg.appendChild(gridLine);
      }
      
      // Draw each data series
      dataSeriesList.forEach((series, seriesIndex) => {
        const column = numericColumns.find(col => col.field === series.field);
        const color = this.getColorForIndex(numericColumns.indexOf(column));
        
        // Draw line
        let pathD = '';
        
        series.data.forEach((point, i) => {
          const x = 40 + (i * (chartContainer.offsetWidth - 50) / Math.max(series.data.length - 1, 1));
          const y = 250 - ((point.y - minValue) / (maxValue - minValue) * 250);
          
          if (i === 0) {
            pathD += `M ${x},${y}`;
          } else {
            pathD += ` L ${x},${y}`;
          }
        });
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        
        svg.appendChild(path);
        
        // Add data points
        series.data.forEach((point, i) => {
          const x = 40 + (i * (chartContainer.offsetWidth - 50) / Math.max(series.data.length - 1, 1));
          const y = 250 - ((point.y - minValue) / (maxValue - minValue) * 250);
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x);
          circle.setAttribute('cy', y);
          circle.setAttribute('r', '3');
          circle.setAttribute('fill', color);
          
          svg.appendChild(circle);
        });
      });
      
      chartContainer.appendChild(svg);
    };
    
    // Initial chart creation
    updateChart();
    
    // Update chart on window resize
    window.addEventListener('resize', updateChart);
  }
  
  /**
   * Create a distribution chart for the summary visualization
   */
  createSummaryDistribution(container, numericColumns) {
    // Create column selection
    const columnSelectContainer = document.createElement('div');
    columnSelectContainer.style.marginBottom = '20px';
    
    const columnSelect = document.createElement('select');
    columnSelect.className = 'column-select';
    
    numericColumns.forEach((column, index) => {
      const option = document.createElement('option');
      option.value = column.field;
      option.textContent = column.title || column.field;
      option.selected = index === 0;
      columnSelect.appendChild(option);
    });
    
    columnSelectContainer.appendChild(columnSelect);
    container.appendChild(columnSelectContainer);
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'distribution-container';
    chartContainer.style.height = '300px';
    chartContainer.style.width = '100%';
    
    container.appendChild(chartContainer);
    
    // Stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    statsContainer.style.marginTop = '20px';
    statsContainer.style.display = 'flex';
    statsContainer.style.justifyContent = 'space-around';
    statsContainer.style.textAlign = 'center';
    statsContainer.style.padding = '10px';
    statsContainer.style.backgroundColor = '#f9f9f9';
    statsContainer.style.borderRadius = '4px';
    
    container.appendChild(statsContainer);
    
    // Function to create the distribution chart
    const createDistribution = (field) => {
      chartContainer.innerHTML = '';
      statsContainer.innerHTML = '';
      
      // Collect data for the selected column
      const values = this.originalData
        .filter(row => row[field] !== undefined && !isNaN(parseFloat(row[field])))
        .map(row => parseFloat(row[field]));
      
      if (values.length === 0) {
        chartContainer.textContent = 'No data to display';
        return;
      }
      
      // Calculate statistics
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Sort values for median and percentiles
      const sortedValues = [...values].sort((a, b) => a - b);
      const median = sortedValues[Math.floor(sortedValues.length / 2)];
      
      // Calculate standard deviation
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Create histogram buckets (10 buckets)
      const bucketCount = 10;
      const bucketSize = range / bucketCount;
      const buckets = Array(bucketCount).fill(0);
      
      values.forEach(value => {
        const bucketIndex = Math.min(bucketCount - 1, Math.floor((value - min) / bucketSize));
        buckets[bucketIndex]++;
      });
      
      const maxBucketCount = Math.max(...buckets);
      
      // Create SVG for the chart
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '250');
      svg.style.display = 'block';
      
      // X axis
      const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      xAxis.setAttribute('x1', '40');
      xAxis.setAttribute('y1', '220');
      xAxis.setAttribute('x2', '100%');
      xAxis.setAttribute('y2', '220');
      xAxis.setAttribute('stroke', '#333');
      xAxis.setAttribute('stroke-width', '1');
      
      svg.appendChild(xAxis);
      
      // Y axis
      const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      yAxis.setAttribute('x1', '40');
      yAxis.setAttribute('y1', '20');
      yAxis.setAttribute('x2', '40');
      yAxis.setAttribute('y2', '220');
      yAxis.setAttribute('stroke', '#333');
      yAxis.setAttribute('stroke-width', '1');
      
      svg.appendChild(yAxis);
      
      // Draw histogram bars
      const barWidth = (chartContainer.offsetWidth - 50) / bucketCount;
      
      buckets.forEach((count, i) => {
        const x = 40 + (i * barWidth);
        const height = (count / maxBucketCount) * 200;
        const y = 220 - height;
        
        // Create bar
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', barWidth - 2);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', `rgba(33, 150, 243, 0.7)`);
        
        svg.appendChild(rect);
        
        // X axis labels (every other bucket)
        if (i % 2 === 0 || i === bucketCount - 1) {
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', x + barWidth / 2);
          label.setAttribute('y', '235');
          label.setAttribute('text-anchor', 'middle');
          label.setAttribute('font-size', '10');
          label.textContent = (min + (i * bucketSize)).toFixed(1);
          
          svg.appendChild(label);
        }
      });
      
      // Draw mean line
      const meanX = 40 + ((avg - min) / range) * (chartContainer.offsetWidth - 50);
      
      const meanLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      meanLine.setAttribute('x1', meanX);
      meanLine.setAttribute('y1', '20');
      meanLine.setAttribute('x2', meanX);
      meanLine.setAttribute('y2', '220');
      meanLine.setAttribute('stroke', 'red');
      meanLine.setAttribute('stroke-width', '2');
      meanLine.setAttribute('stroke-dasharray', '5,5');
      
      svg.appendChild(meanLine);
      
      // Mean label
      const meanLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      meanLabel.setAttribute('x', meanX);
      meanLabel.setAttribute('y', '15');
      meanLabel.setAttribute('text-anchor', 'middle');
      meanLabel.setAttribute('font-size', '12');
      meanLabel.setAttribute('fill', 'red');
      meanLabel.textContent = 'Mean';
      
      svg.appendChild(meanLabel);
      
      chartContainer.appendChild(svg);
      
      // Display stats
      const createStatElement = (label, value) => {
        const statElem = document.createElement('div');
        statElem.className = 'stat-item';
        
        const labelElem = document.createElement('div');
        labelElem.className = 'stat-label';
        labelElem.textContent = label;
        labelElem.style.fontWeight = 'bold';
        
        const valueElem = document.createElement('div');
        valueElem.className = 'stat-value';
        valueElem.textContent = value;
        
        statElem.appendChild(labelElem);
        statElem.appendChild(valueElem);
        
        return statElem;
      };
      
      statsContainer.appendChild(createStatElement('Count', values.length));
      statsContainer.appendChild(createStatElement('Mean', avg.toFixed(2)));
      statsContainer.appendChild(createStatElement('Median', median.toFixed(2)));
      statsContainer.appendChild(createStatElement('Std Dev', stdDev.toFixed(2)));
      statsContainer.appendChild(createStatElement('Min', min.toFixed(2)));
      statsContainer.appendChild(createStatElement('Max', max.toFixed(2)));
    };
    
    // Initial chart creation
    createDistribution(columnSelect.value);
    
    // Update chart when column selection changes
    columnSelect.addEventListener('change', (e) => {
      createDistribution(e.target.value);
    });
  }
  
  /**
   * Get a color for a value between 0-100
   */
  getColorForValue(percentage) {
    if (percentage < 25) {
      return '#F44336'; // Red for low values
    } else if (percentage < 50) {
      return '#FFC107'; // Yellow for mid-low values
    } else if (percentage < 75) {
      return '#2196F3'; // Blue for mid-high values
    } else {
      return '#4CAF50'; // Green for high values
    }
  }
  
  /**
   * Get a color from the visualization colors array
   */
  getColorForIndex(index) {
    return this.options.visualizationColors[index % this.options.visualizationColors.length];
  }
  
  /**
   * Initialize rules engine for conditional formatting and business rules
   */
  initRulesEngine() {
    // Create a button for the toolbar to manage rules if needed
    if (this.options.businessRules && this.options.businessRules.length > 0) {
      const rulesBtn = document.createElement('button');
      rulesBtn.textContent = 'Validate Rules';
      rulesBtn.className = 'rules-btn';
      rulesBtn.addEventListener('click', () => this.validateAllRules());
      
      this.toolbarElement.querySelector('.export-buttons').appendChild(rulesBtn);
    }
    
    // Initialize rule evaluator
    this.rulesEngine = {
      evaluateCondition: (condition, row, column, value) => {
        try {
          switch (condition.operator) {
            // Numeric comparisons
            case '=':
            case '==':
              return value == condition.value;
            case '===':
              return value === condition.value;
            case '!=':
            case '<>':
              return value != condition.value;
            case '!==':
              return value !== condition.value;
            case '>':
              return Number(value) > Number(condition.value);
            case '>=':
              return Number(value) >= Number(condition.value);
            case '<':
              return Number(value) < Number(condition.value);
            case '<=':
              return Number(value) <= Number(condition.value);
              
            // String operations
            case 'contains':
              return String(value).includes(String(condition.value));
            case 'not_contains':
              return !String(value).includes(String(condition.value));
            case 'starts_with':
              return String(value).startsWith(String(condition.value));
            case 'ends_with':
              return String(value).endsWith(String(condition.value));
            case 'regex':
              return new RegExp(condition.value).test(String(value));
              
            // Array operations
            case 'in':
              return Array.isArray(condition.value) && condition.value.includes(value);
            case 'not_in':
              return Array.isArray(condition.value) && !condition.value.includes(value);
              
            // Null/empty checks
            case 'is_null':
              return value === null || value === undefined;
            case 'is_not_null':
              return value !== null && value !== undefined;
            case 'is_empty':
              return value === '' || value === null || value === undefined;
            case 'is_not_empty':
              return value !== '' && value !== null && value !== undefined;
              
            // Custom function
            case 'function':
              if (typeof condition.value === 'function') {
                return condition.value(value, row, column);
              }
              return false;
              
            default:
              console.warn('Unknown operator:', condition.operator);
              return false;
          }
        } catch (error) {
          console.error('Error evaluating condition:', error);
          return false;
        }
      },
      
      evaluateRule: (rule, row) => {
        try {
          // Check if the rule has a target field
          if (rule.field) {
            const column = this.options.columns.find(col => col.field === rule.field);
            const value = row[rule.field];
            
            // Cache key for rule evaluation
            const cacheKey = `${JSON.stringify(rule)}-${JSON.stringify(value)}`;
            
            // Check if we have cached result
            if (this.ruleEvaluations.has(cacheKey)) {
              return this.ruleEvaluations.get(cacheKey);
            }
            
            // Evaluate the condition
            const result = this.rulesEngine.evaluateCondition(rule.condition, row, column, value);
            
            // Cache the result
            this.ruleEvaluations.set(cacheKey, result);
            
            return result;
          } 
          // If rule is a function, call it with the row
          else if (typeof rule.evaluate === 'function') {
            return rule.evaluate(row);
          }
          
          return false;
        } catch (error) {
          console.error('Error evaluating rule:', error);
          return false;
        }
      }
    };
  }
}

// Add CSS styles for the library
const addStyles = () => {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Base styles */
    .advanced-table-container {
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      color: #333;
    }
    
    .advanced-table-wrapper {
      width: 100%;
      overflow: auto;
      max-height: 500px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      position: relative;
    }
    
    .advanced-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .advanced-table th,
    .advanced-table td {
      padding: 10px;
      border-bottom: 1px solid #e0e0e0;
      text-align: left;
      transition: background-color 0.2s;
    }
    
    .advanced-table th {
      background-color: #f5f5f5;
      font-weight: 600;
      position: relative;
      user-select: none;
      border-bottom: 2px solid #ddd;
    }
    
    .advanced-table tr:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
    
    .advanced-table-toolbar {
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .advanced-table-search {
      flex: 1;
      margin-right: 20px;
    }
    
    .advanced-table-search input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    
    .advanced-table-search input:focus {
      border-color: #4CAF50;
      outline: none;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.25);
    }
    
    .toolbar-spacer {
      flex: 1;
    }
    
    .export-buttons {
      display: flex;
      gap: 8px;
    }
    
    .advanced-table-toolbar button {
      padding: 8px 12px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
      font-size: 14px;
    }
    
    .advanced-table-toolbar button:hover {
      background-color: #e0e0e0;
    }
    
    .excel-btn::before {
      content: "📊 ";
    }
    
    .pdf-btn::before {
      content: "📄 ";
    }
    
    .print-btn::before {
      content: "🖨️ ";
    }
    
    .advanced-table-pagination {
      margin-top: 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
    }
    
    .pagination-controls {
      display: flex;
      align-items: center;
    }
    
    .page-size-container {
      display: flex;
      align-items: center;
    }
    
    .page-size-selector {
      margin-left: 8px;
      padding: 4px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .advanced-table-pagination button {
      padding: 6px 12px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      cursor: pointer;
      transition: all 0.2s;
      margin: 0 2px;
    }
    
    .advanced-table-pagination button:first-child {
      border-radius: 4px 0 0 4px;
      margin-right: 0;
    }
    
    .advanced-table-pagination button:last-child {
      border-radius: 0 4px 4px 0;
      margin-left: 0;
    }
    
    .advanced-table-pagination .first-page,
    .advanced-table-pagination .last-page {
      font-size: 12px;
      padding: 6px 8px;
      font-weight: bold;
    }
    
    .advanced-table-pagination button:hover:not(:disabled) {
      background-color: #e0e0e0;
    }
    
    .advanced-table-pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .advanced-table-pagination .page-info {
      margin: 0 10px;
    }
    
    .advanced-table.loading {
      opacity: 0.6;
    }
    
    .advanced-table-wrapper::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
    }
    
    .advanced-table.loading + .advanced-table-wrapper::after {
      animation: spin 1s linear infinite;
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    
    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
    
    /* Empty and error states */
    .advanced-table .no-data-message,
    .advanced-table .error-message {
      text-align: center;
      padding: 20px;
      color: #666;
    }
    
    .advanced-table .error-message {
      color: #d32f2f;
    }
    
    /* Freeze header styles */
    .freeze-header thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
    }
    
    /* Freeze columns styles */
    .freeze-columns th:nth-child(-n + var(--freeze-columns)),
    .freeze-columns td:nth-child(-n + var(--freeze-columns)) {
      position: sticky;
      left: 0;
      z-index: 1;
      background-color: inherit;
    }
    
    .freeze-columns th:nth-child(-n + var(--freeze-columns)) {
      z-index: 3;
    }
    
    /* Sortable columns */
    .advanced-table th.sortable {
      cursor: pointer;
    }
    
    .advanced-table th.sortable::after {
      content: "⇵";
      font-size: 12px;
      margin-left: 5px;
      opacity: 0.3;
    }
    
    .advanced-table th.sorted-asc::after {
      content: "↑";
      opacity: 1;
    }
    
    .advanced-table th.sorted-desc::after {
      content: "↓";
      opacity: 1;
    }
    
    /* Resizable columns */
    .advanced-table th {
      position: relative;
    }
    
    .column-resizer {
      position: absolute;
      top: 0;
      right: 0;
      width: 5px;
      height: 100%;
      cursor: col-resize;
    }
    
    .advanced-table th.resizing {
      opacity: 0.8;
    }
    
    /* Context Menu */
    .advanced-table-context-menu {
      position: fixed;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      min-width: 150px;
      z-index: 1000;
    }
    
    .context-menu-item {
      padding: 8px 15px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .context-menu-item:hover {
      background-color: #f5f5f5;
    }
    
    .context-menu-item.divider {
      height: 1px;
      background-color: #ddd;
      padding: 0;
      margin: 5px 0;
    }
    
    .context-menu-item.with-icon::before {
      content: var(--menu-icon);
      margin-right: 8px;
    }
    
    /* Table Themes */
    
    /* Default theme - already defined above */
    
    /* Material theme */
    .advanced-table-theme-material .advanced-table th {
      background-color: #2196F3;
      color: white;
      font-weight: 500;
      padding: 12px 15px;
    }
    
    .advanced-table-theme-material .advanced-table td {
      padding: 12px 15px;
    }
    
    .advanced-table-theme-material .advanced-table-wrapper {
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      border: none;
    }
    
    .advanced-table-theme-material .advanced-table tr:hover {
      background-color: rgba(33, 150, 243, 0.05);
    }
    
    /* Dark theme */
    .advanced-table-theme-dark {
      color: #eee;
    }
    
    .advanced-table-theme-dark .advanced-table-wrapper {
      border-color: #444;
      background-color: #222;
    }
    
    .advanced-table-theme-dark .advanced-table th {
      background-color: #333;
      color: #fff;
      border-bottom-color: #555;
    }
    
    .advanced-table-theme-dark .advanced-table td {
      border-bottom-color: #444;
    }
    
    .advanced-table-theme-dark .advanced-table tr:hover td {
      background-color: #2a2a2a;
    }
    
    .advanced-table-theme-dark .advanced-table-toolbar button,
    .advanced-table-theme-dark .advanced-table-pagination button {
      background-color: #333;
      border-color: #444;
      color: #eee;
    }
    
    .advanced-table-theme-dark .advanced-table-search input,
    .advanced-table-theme-dark .page-size-selector {
      background-color: #333;
      border-color: #444;
      color: #eee;
    }
    
    /* Stripe theme */
    .advanced-table-theme-stripe .advanced-table tbody tr:nth-child(odd) td {
      background-color: rgba(0, 0, 0, 0.03);
    }
    
    .advanced-table-theme-stripe .advanced-table tr:hover td {
      background-color: rgba(0, 0, 0, 0.06);
    }
    
    /* Compact theme */
    .advanced-table-theme-compact .advanced-table th,
    .advanced-table-theme-compact .advanced-table td {
      padding: 6px 8px;
      font-size: 13px;
    }
    
    .advanced-table-theme-compact .advanced-table-wrapper {
      max-height: 400px;
    }
    
    /* Colorful theme */
    .advanced-table-theme-colorful .advanced-table th {
      background: linear-gradient(135deg, #42a5f5 0%, #4776e6 100%);
      color: white;
      font-weight: 500;
    }
    
    .advanced-table-theme-colorful .advanced-table-pagination button:not(:disabled) {
      background: linear-gradient(135deg, #42a5f5 0%, #4776e6 100%);
      color: white;
      border: none;
    }
    
    .advanced-table-theme-colorful .advanced-table tr:nth-child(4n+1) {
      background-color: rgba(66, 165, 245, 0.05);
    }
    
    .advanced-table-theme-colorful .advanced-table tr:nth-child(4n+3) {
      background-color: rgba(71, 118, 230, 0.05);
    }
    
    .advanced-table-theme-colorful .export-buttons button {
      background: linear-gradient(135deg, #42a5f5 0%, #4776e6 100%);
      color: white;
      border: none;
    }
    
    /* Insights panel */
    .advanced-table-insights {
      padding: 10px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    
    .insights-btn {
      background-color: #ffeb3b;
      border: 1px solid #fdd835;
      color: #333;
    }
    
    .insights-btn:hover {
      background-color: #fdd835;
    }
    
    .insights-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .insight-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    
    .insight-item:last-child {
      border-bottom: none;
    }
    
    .insight-icon {
      margin-right: 10px;
      font-size: 18px;
    }
    
    .insight-content {
      flex: 1;
    }
    
    .insight-message {
      font-weight: bold;
    }
    
    .insight-detail {
      font-size: 14px;
      color: #666;
    }
    
    .insight-info .insight-icon {
      color: #2196F3;
    }
    
    .insight-warning .insight-icon {
      color: #FF9800;
    }
    
    .insight-error .insight-icon {
      color: #F44336;
    }
    
    .insights-loading,
    .insights-empty {
      text-align: center;
      color: #666;
      padding: 20px;
    }
    
    /* Collaboration styles */
    .cell-edit-input {
      width: 100%;
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .cell-changed {
      background-color: #e0f7fa;
      transition: background-color 0.5s;
    }
    
    .cell-restored {
      background-color: #fff3e0;
      transition: background-color 0.5s;
    }
    
    .collaboration-tooltip {
      position: absolute;
      top: -25px;
      left: 0;
      background-color: #333;
      color: #fff;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 10;
    }
    
    .user-cursor {
      position: absolute;
      width: 5px;
      height: 100%;
      background-color: #2196F3;
      opacity: 0.7;
      z-index: 10;
    }
    
    .user-cursor-label {
      position: absolute;
      top: -20px;
      left: 0;
      background-color: #2196F3;
      color: #fff;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 12px;
      white-space: nowrap;
    }
    
    .collaborators-container {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .collaborator {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      transition: opacity 0.5s;
    }
    
    .collaborator.disconnected {
      opacity: 0.5;
    }
    
    .collaborator-avatar {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #2196F3;
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
    }
    
    .collaborator-name {
      font-size: 14px;
    }
    
    .version-history-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      width: 400px;
      max-height: 80%;
      overflow: auto;
      z-index: 1000;
    }
    
    .version-history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    
    .version-history-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .version-history-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
    
    .version-history-content {
      padding: 10px;
    }
    
    .version-history-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .version-history-item {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .version-history-item:last-child {
      border-bottom: none;
    }
    
    .version-history-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    
    .version-number {
      font-weight: bold;
    }
    
    .version-user {
      font-size: 14px;
      color: #666;
    }
    
    .version-time {
      font-size: 12px;
      color: #999;
    }
    
    .version-content {
      font-size: 14px;
      color: #333;
    }
    
    .version-restore-btn {
      margin-top: 5px;
      padding: 5px 10px;
      background-color: #4CAF50;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .version-restore-btn:hover {
      background-color: #45a049;
    }
    
    .current-version {
      background-color: #e0f7fa;
    }
  `;
  
  document.head.appendChild(styleElement);
};

// Initialize styles when the module is loaded
if (typeof document !== 'undefined') {
  addStyles();
}

// Export the library
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tabelin;
} else if (typeof window !== 'undefined') {
  window.Tabelin = Tabelin;
}