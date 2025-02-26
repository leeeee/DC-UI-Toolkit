// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 364, height: 500 });

// 配置
const CONFIG = {
  pageSize: 50, // 每页加载的组件数量，增加数量以减少分页请求
  skipThumbnails: true, // 跳过缩略图生成
  onlyDefaultVariants: true, // 对于组件集，只加载默认变体
  loadAllPages: true, // 加载所有页面
  maxPagesToLoad: 5, // 最多加载的页面数量，避免加载过多页面导致性能问题
  enableTeamLibraries: true, // 启用团队库支持
  syncInterval: 3600, // 同步间隔(秒)
  cacheExpiration: 86400 // 缓存有效期(秒)
};

// 组件管理器
class ComponentManager {
  constructor() {
    this.localComponents = [];
    this.allComponents = [];
    this.currentPage = 0;
    this.isLoading = false;
    this.hasMoreComponents = true;
    this.teamLibraries = []; // 存储团队库信息
    this.libraryComponents = new Map(); // 库ID到组件的映射
  }
  
  // 初始化
  async initialize() {
    try {
      figma.ui.postMessage({
        type: 'loading-status',
        message: '正在加载组件...',
        progress: 0
      });
      
      // 重置分页
      this.resetPagination();
      
      // 如果启用了团队库，先加载团队库
      if (CONFIG.enableTeamLibraries) {
        figma.ui.postMessage({
          type: 'loading-status',
          message: '正在发现可用的团队库...',
          progress: 0.1
        });
        
        await this.discoverTeamLibraries();
        
        if (this.teamLibraries.length > 0) {
          figma.ui.postMessage({
            type: 'loading-status',
            message: `发现 ${this.teamLibraries.length} 个团队库，正在加载组件...`,
            progress: 0.2
          });
          
          // 加载每个团队库的组件
          let loadedLibraries = 0;
          for (const library of this.teamLibraries) {
            figma.ui.postMessage({
              type: 'loading-status',
              message: `正在加载团队库 "${library.name}" (${loadedLibraries+1}/${this.teamLibraries.length})...`,
              progress: 0.2 + (loadedLibraries / this.teamLibraries.length) * 0.3
            });
            
            await this.syncLibraryComponents(library.id);
            loadedLibraries++;
          }
        } else {
          figma.ui.postMessage({
            type: 'loading-status',
            message: '未发现可用的团队库',
            progress: 0.3
          });
        }
      }
      
      // 加载本地组件
      figma.ui.postMessage({
        type: 'loading-status',
        message: '正在加载本地组件...',
        progress: 0.5
      });
      
      // 加载第一页组件
      await this.loadNextPage();
      
      return true;
    } catch (error) {
      console.error('初始化组件数据失败:', error);
      figma.ui.postMessage({
        type: 'initialization-error',
        error: error.message || '未知错误'
      });
      return false;
    }
  }
  
  // 发现可用的团队库
  async discoverTeamLibraries() {
    try {
      // 获取可用的团队库 - 修正 API 方法名
      const libraries = await figma.teamLibrary.getAvailableTeamLibrariesAsync();
      this.teamLibraries = libraries.map(lib => ({
        id: lib.key,
        name: lib.name,
        status: 'active'
      }));
      
      // 发送团队库列表到 UI
      figma.ui.postMessage({
        type: 'team-libraries-loaded',
        libraries: this.teamLibraries
      });
      
      return this.teamLibraries;
    } catch (error) {
      console.error('获取团队库失败:', error);
      figma.ui.postMessage({
        type: 'team-libraries-error',
        error: error.message || '无法获取团队库'
      });
      return [];
    }
  }
  
  // 同步团队库组件
  async syncLibraryComponents(libraryId) {
    try {
      // 获取团队库组件 - 修正 API 方法名
      const components = await figma.teamLibrary.getTeamComponentsAsync(libraryId);
      
      // 查找库名称
      let libraryName = '未知库';
      const library = this.teamLibraries.find(lib => lib.id === libraryId);
      if (library) {
        libraryName = library.name;
      }
      
      // 组织组件集和变体
      const componentSets = new Map();
      const standaloneComponents = [];
      
      // 第一遍：识别组件集和独立组件
      for (const component of components) {
        if (component.containing_frame) {
          // 这是组件集中的变体
          if (!componentSets.has(component.containing_frame)) {
            componentSets.set(component.containing_frame, []);
          }
          componentSets.get(component.containing_frame).push(component);
        } else {
          // 这是独立组件
          standaloneComponents.push(component);
        }
      }
      
      // 处理组件数据
      let processedComponents = [];
      
      // 添加独立组件
      for (const component of standaloneComponents) {
        processedComponents.push({
          id: component.key,
          name: component.name,
          type: 'TEAM_COMPONENT',
          libraryId: libraryId,
          isLocal: false,
          thumbnailUrl: component.thumbnailUrl || null,
          description: component.description || '',
          libraryName: libraryName
        });
      }
      
      // 处理组件集
      if (CONFIG.onlyDefaultVariants) {
        // 只添加每个组件集的默认变体（或第一个变体）
        for (const [setId, variants] of componentSets.entries()) {
          // 找出默认变体或使用第一个
          const defaultVariant = variants.find(v => v.is_default_variant) || variants[0];
          if (defaultVariant) {
            processedComponents.push({
              id: defaultVariant.key,
              name: defaultVariant.name,
              type: 'TEAM_COMPONENT',
              libraryId: libraryId,
              isLocal: false,
              thumbnailUrl: defaultVariant.thumbnailUrl || null,
              description: defaultVariant.description || '',
              libraryName: libraryName,
              isDefaultVariant: true,
              componentSetId: setId
            });
          }
        }
      } else {
        // 添加所有变体
        for (const variants of componentSets.values()) {
          for (const variant of variants) {
            processedComponents.push({
              id: variant.key,
              name: variant.name,
              type: 'TEAM_COMPONENT',
              libraryId: libraryId,
              isLocal: false,
              thumbnailUrl: variant.thumbnailUrl || null,
              description: variant.description || '',
              libraryName: libraryName,
              isDefaultVariant: variant.is_default_variant,
              componentSetId: variant.containing_frame
            });
          }
        }
      }
      
      // 存储组件数据
      this.libraryComponents.set(libraryId, {
        components: processedComponents,
        lastSynced: Date.now()
      });
      
      return processedComponents;
    } catch (error) {
      console.error(`同步团队库 ${libraryId} 组件失败:`, error);
      figma.ui.postMessage({
        type: 'library-sync-error',
        libraryId: libraryId,
        error: error.message || '无法同步团队库组件'
      });
      return [];
    }
  }
  
  // 重置分页
  resetPagination() {
    this.currentPage = 0;
    this.allComponents = [];
    this.hasMoreComponents = true;
  }
  
  // 加载下一页组件
  async loadNextPage() {
    if (this.isLoading || !this.hasMoreComponents) return false;
    
    this.isLoading = true;
    
    try {
      // 如果是第一页且本地组件为空，则加载本地组件
      if (this.currentPage === 0 && this.localComponents.length === 0) {
        this.localComponents = await this.getLocalComponents();
      }
      
      // 从本地组件中获取当前页
      const startIndex = this.currentPage * CONFIG.pageSize;
      const newComponents = this.localComponents.slice(startIndex, startIndex + CONFIG.pageSize);
      
      // 检查是否还有更多组件
      this.hasMoreComponents = startIndex + CONFIG.pageSize < this.localComponents.length;
      
      // 如果有新组件，增加页码
      if (newComponents.length > 0) {
        this.currentPage++;
        this.allComponents = [...this.allComponents, ...newComponents];
      } else {
        this.hasMoreComponents = false;
      }
      
      // 发送组件数据到 UI
      figma.ui.postMessage({
        type: 'components-page-loaded',
        components: newComponents,
        currentPage: this.currentPage,
        hasMore: this.hasMoreComponents
      });
      
      this.isLoading = false;
      return newComponents.length > 0;
    } catch (error) {
      console.error('加载组件页失败:', error);
      this.isLoading = false;
      
      figma.ui.postMessage({
        type: 'page-load-error',
        error: error.message || '未知错误'
      });
      
      return false;
    }
  }
  
  // 获取本地组件
  async getLocalComponents() {
    try {
      let pages = [];
      
      if (CONFIG.loadAllPages) {
        try {
          // 尝试加载所有页面
          await figma.loadAllPagesAsync();
          
          // 获取所有页面，但限制数量
          pages = figma.root.children.slice(0, CONFIG.maxPagesToLoad);
          
          figma.ui.postMessage({
            type: 'loading-status',
            message: `正在加载 ${pages.length} 个页面的组件...`,
            progress: 0.6
          });
        } catch (error) {
          console.error('加载所有页面失败:', error);
          // 如果加载所有页面失败，只加载当前页面
          await figma.currentPage.loadAsync();
          pages = [figma.currentPage];
        }
      } else {
        // 只加载当前页面
        await figma.currentPage.loadAsync();
        pages = [figma.currentPage];
      }
      
      let components = [];
      let processedPages = 0;
      
      // 遍历页面查找组件
      for (const page of pages) {
        try {
          // 确保页面已加载
          if (!page.children) {
            await page.loadAsync();
          }
          
          // 递归查找组件
          const pageComponents = await this.findComponentsInNode(page);
          components = components.concat(pageComponents);
          
          // 更新进度
          processedPages++;
          const progress = 0.6 + (processedPages / pages.length) * 0.2;
          
          figma.ui.postMessage({
            type: 'loading-status',
            message: `已在 ${processedPages}/${pages.length} 个页面中找到 ${components.length} 个组件...`,
            progress: progress
          });
        } catch (error) {
          console.error(`处理页面 ${page.name} 时出错:`, error);
        }
      }
      
      // 不再生成缩略图，直接清理节点引用
      for (const component of components) {
        if (component.node) {
          delete component.node;
        }
      }
      
      // 合并团队库组件
      if (CONFIG.enableTeamLibraries) {
        let teamComponents = [];
        
        // 从所有团队库中收集组件
        for (const [libraryId, data] of this.libraryComponents.entries()) {
          teamComponents = teamComponents.concat(data.components);
        }
        
        // 添加团队库组件到结果中
        components = [...components, ...teamComponents];
        
        figma.ui.postMessage({
          type: 'loading-status',
          message: `合并了 ${teamComponents.length} 个团队库组件`,
          progress: 0.9
        });
      }
      
      // 发送完成消息
      figma.ui.postMessage({
        type: 'loading-status',
        message: `加载完成，共 ${components.length} 个组件`,
        progress: 1
      });
      
      return components;
    } catch (error) {
      console.error('获取本地组件时出错:', error);
      throw error;
    }
  }
  
  // 递归查找节点中的所有组件
  async findComponentsInNode(node) {
    let components = [];
    
    if (node.type === 'COMPONENT_SET') {
      // 对于组件集，如果配置为只显示默认变体，则只添加默认变体
      if (CONFIG.onlyDefaultVariants) {
        const defaultVariant = node.defaultVariant || node.children[0];
        if (defaultVariant) {
          components.push({
            id: defaultVariant.id,
            name: defaultVariant.name,
            type: 'COMPONENT',
            node: CONFIG.skipThumbnails ? null : defaultVariant,
            isLocal: true,
            isDefaultVariant: true,
            parentComponentSet: node.id
          });
        }
      } else {
        // 否则添加组件集本身
        components.push({
          id: node.id,
          name: node.name,
          type: node.type,
          node: CONFIG.skipThumbnails ? null : node,
          isLocal: true
        });
      }
    } else if (node.type === 'COMPONENT') {
      // 对于单个组件，检查是否是组件集的一部分
      const isPartOfComponentSet = node.parent && node.parent.type === 'COMPONENT_SET';
      
      // 如果不是组件集的一部分，或者不是只显示默认变体的配置，则添加该组件
      if (!isPartOfComponentSet || !CONFIG.onlyDefaultVariants) {
        components.push({
          id: node.id,
          name: node.name,
          type: node.type,
          node: CONFIG.skipThumbnails ? null : node,
          isLocal: true,
          isDefaultVariant: isPartOfComponentSet && node.parent.defaultVariant === node
        });
      }
    }
    
    // 递归处理子节点
    if ('children' in node && node.children) {
      for (const child of node.children) {
        const childComponents = await this.findComponentsInNode(child);
        components = components.concat(childComponents);
      }
    }
    
    return components;
  }
  
  // 插入组件
  async insertComponent(componentId, libraryId = null) {
    try {
      if (libraryId) {
        // 团队库组件 - 修正 API 方法名
        const importedComponent = await figma.teamLibrary.importComponentFromTeamLibraryAsync(componentId, libraryId);
        
        if (!importedComponent) {
          throw new Error('无法导入团队库组件');
        }
        
        // 创建实例
        const instance = importedComponent.createInstance();
        
        // 将组件添加到当前页面并选中它
        figma.currentPage.appendChild(instance);
        figma.currentPage.selection = [instance];
        figma.viewport.scrollAndZoomIntoView([instance]);
        
        return true;
      } else {
        // 本地组件
        const node = await figma.getNodeByIdAsync(componentId);
        
        if (!node) {
          throw new Error('找不到指定的组件');
        }
        
        let instance;
        
        // 根据节点类型创建实例
        if (node.type === 'COMPONENT') {
          instance = node.createInstance();
        } else if (node.type === 'COMPONENT_SET') {
          // 对于组件集，使用默认变体
          const defaultVariant = node.defaultVariant || node.children[0];
          instance = defaultVariant.createInstance();
        } else {
          throw new Error('选择的节点不是组件');
        }
        
        // 将组件添加到当前页面并选中它
        figma.currentPage.appendChild(instance);
        figma.currentPage.selection = [instance];
        figma.viewport.scrollAndZoomIntoView([instance]);
        
        return true;
      }
    } catch (error) {
      console.error('插入组件时出错:', error);
      throw error;
    }
  }
}

// 创建组件管理器实例
const componentManager = new ComponentManager();

// 在插件启动时初始化
componentManager.initialize();

// 处理来自 UI 的消息
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'insert-component':
      try {
        const success = await componentManager.insertComponent(msg.componentId, msg.libraryId);
        
        // 通知 UI
        figma.ui.postMessage({ 
          type: 'component-inserted',
          success: true,
          componentId: msg.componentId
        });
      } catch (error) {
        console.error('插入组件时出错:', error);
        // 发送错误消息到 UI
        figma.ui.postMessage({ 
          type: 'component-inserted',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
      break;
      
    case 'load-more-components':
      // 加载更多组件
      await componentManager.loadNextPage();
      break;
      
    case 'refresh-components':
      // 重新初始化
      await componentManager.initialize();
      break;
      
    case 'sync-library':
      // 同步特定团队库
      try {
        await componentManager.syncLibraryComponents(msg.libraryId);
        figma.ui.postMessage({
          type: 'library-synced',
          libraryId: msg.libraryId,
          success: true
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'library-synced',
          libraryId: msg.libraryId,
          success: false,
          error: error.message || '同步失败'
        });
      }
      break;
      
    case 'cancel':
      figma.closePlugin();
      break;
  }
};