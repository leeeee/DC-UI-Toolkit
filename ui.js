// 使用 React 和 ReactDOM
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// 内联样式
const styles = {
  sidebar: {
    width: '64px',
    height: '100vh',
    borderRight: '1px solid #E5E5E5',
    flexShrink: 0,
    backgroundColor: '#FFFFFF'
  },
  sidebarTab: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    borderBottom: '1px solid #E5E5E5'
  },
  sidebarTabActive: {
    backgroundColor: '#EDEDED'
  },
  sidebarTabActiveBefore: {
    content: '',
    position: 'absolute',
    left: 0,
    top: 0,
    width: '4px',
    height: '100%',
    backgroundColor: '#000'
  },
  sidebarTabIcon: {
    width: '24px',
    height: '24px',
    backgroundColor: '#000',
    borderRadius: '2px'
  },
  mainContent: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  pluginName: {
    fontWeight: 600,
    fontSize: '14px'
  },
  searchContainer: {
    position: 'relative',
    flexGrow: 1,
    marginLeft: '12px'
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 32px',
    border: '1px solid #E5E5E5',
    borderRadius: '6px',
    fontSize: '12px'
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#888'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #E5E5E5',
    marginBottom: '16px'
  },
  tab: {
    padding: '8px 16px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  tabActive: {
    borderBottomColor: '#18A0FB',
    color: '#18A0FB',
    fontWeight: 500
  },
  componentList: {
    overflowY: 'auto',
    flexGrow: 1
  },
  componentItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  componentItemHover: {
    backgroundColor: '#F5F5F5'
  },
  componentThumbnail: {
    width: '40px',
    height: '40px',
    backgroundColor: '#E5E5E5',
    borderRadius: '4px',
    marginRight: '12px'
  },
  componentName: {
    fontWeight: 500
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
    textAlign: 'center'
  },
  emptyStateIcon: {
    fontSize: '24px',
    marginBottom: '8px'
  },
  root: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    overflow: 'hidden'
  }
};

// 侧边栏 Tab 组件
const SidebarTab = ({ id, isActive, onClick }) => {
  const tabStyle = {
    ...styles.sidebarTab,
    ...(isActive ? styles.sidebarTabActive : {})
  };
  
  return (
    <div style={tabStyle} onClick={() => onClick(id)}>
      {isActive && <div style={styles.sidebarTabActiveBefore}></div>}
      <div style={styles.sidebarTabIcon}></div>
    </div>
  );
};

// 组件列表项
const ComponentItem = ({ component, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      style={{
        ...styles.componentItem,
        ...(isHovered ? styles.componentItemHover : {})
      }}
      onClick={() => onSelect(component)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.componentThumbnail}></div>
      <div style={styles.componentName}>{component.name}</div>
    </div>
  );
};

// 空状态组件
const EmptyState = ({ message }) => {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyStateIcon}>🔍</div>
      <p>{message}</p>
    </div>
  );
};

// 标签页组件
const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div style={styles.tabs}>
      {tabs.map(tab => (
        <div 
          key={tab.id} 
          style={{
            ...styles.tab,
            ...(activeTab === tab.id ? styles.tabActive : {})
          }}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.name}
        </div>
      ))}
    </div>
  );
};

// 主应用组件
const App = () => {
  const [components, setComponents] = useState([]);
  const [filteredComponents, setFilteredComponents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSidebarTab, setActiveSidebarTab] = useState('components');
  const [isLoading, setIsLoading] = useState(true);

  // 侧边栏 Tab 数据
  const sidebarTabs = [
    { id: 'components' },
    { id: 'styles' },
    { id: 'templates' },
    { id: 'settings' }
  ];

  // 内容区 Tab 数据
  const contentTabs = [
    { id: 'all', name: '全部' },
    { id: 'recent', name: '最近使用' },
    { id: 'favorites', name: '收藏' }
  ];

  // 模拟从 Figma API 获取组件数据
  useEffect(() => {
    // 在实际应用中，这里会调用 Figma API
    const fetchComponents = async () => {
      setIsLoading(true);
      
      // 模拟 API 调用延迟
      setTimeout(() => {
        const mockComponents = [
          { id: '1', name: 'Component_1' },
          { id: '2', name: 'Component_2' },
          { id: '3', name: 'Component_3' },
          { id: '4', name: 'Component_4' },
          { id: '5', name: 'Component_5' },
          { id: '6', name: 'Component_6' },
          { id: '7', name: 'Component_7' },
        ];
        
        setComponents(mockComponents);
        setFilteredComponents(mockComponents);
        setIsLoading(false);
      }, 1000);
    };

    fetchComponents();
  }, []);

  // 搜索过滤逻辑
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredComponents(components);
    } else {
      const filtered = components.filter(component => 
        component.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredComponents(filtered);
    }
  }, [searchTerm, components]);

  // 标签页过滤逻辑
  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredComponents(
        searchTerm ? 
          components.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : 
          components
      );
    } else if (activeTab === 'recent') {
      setFilteredComponents([]);
    } else if (activeTab === 'favorites') {
      setFilteredComponents([]);
    }
  }, [activeTab, components, searchTerm]);

  // 处理组件选择
  const handleComponentSelect = (component) => {
    parent.postMessage({ 
      pluginMessage: { 
        type: 'insert-component', 
        componentId: component.id 
      } 
    }, '*');
  };

  // 处理侧边栏 Tab 切换
  const handleSidebarTabChange = (tabId) => {
    setActiveSidebarTab(tabId);
  };

  return (
    <div style={styles.root}>
      <div style={styles.sidebar}>
        {sidebarTabs.map(tab => (
          <SidebarTab
            key={tab.id}
            id={tab.id}
            isActive={activeSidebarTab === tab.id}
            onClick={handleSidebarTabChange}
          />
        ))}
      </div>
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.pluginName}>DC UI Toolkit</div>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="搜索组件..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs 
          tabs={contentTabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        <div style={styles.componentList}>
          {isLoading ? (
            <EmptyState message="加载中..." />
          ) : filteredComponents.length > 0 ? (
            filteredComponents.map(component => (
              <ComponentItem 
                key={component.id} 
                component={component} 
                onSelect={handleComponentSelect} 
              />
            ))
          ) : (
            <EmptyState 
              message={
                activeTab === 'all' 
                  ? "没有找到匹配的组件" 
                  : activeTab === 'recent' 
                    ? "没有最近使用的组件" 
                    : "没有收藏的组件"
              } 
            />
          )}
        </div>
      </div>
    </div>
  );
};

// 渲染应用
ReactDOM.render(<App />, document.getElementById('root')); 