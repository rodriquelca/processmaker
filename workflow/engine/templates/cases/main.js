var PANEL_EAST_OPEN = false;
var timerMinutes = 2*60*1000;  //every 2 minutes, this should be customized also,

var currentSelectedTreeMenuItem = null;
var centerPanel;

var menuTree;

var winSize = parent.getClientWindowSize(); 

var detailsMenuTreePanelHeight  = winSize.height - 420;
var detailsdebugVariablesHeight = winSize.height - 200;

var debugVarTpl = new Ext.Template('<span style="font-size:11">{value}</span>');
debugVarTpl.compile();

var detailsText = '<i></i>';

var debugTriggersDetailTpl = new Ext.Template('<pre style="font-size:10px"><code>{code}</code></pre>');
debugTriggersDetailTpl.compile();
  
var propStore;
var triggerStore;

var debugVariablesFilter;
var ReloadTreeMenuItemDetail;
var NOTIFIER_FLAG = false;
var result;
var _action = '';
var _CASE_TITLE;

new Ext.KeyMap(document, {
  key: Ext.EventObject.F5,
  fn: function(keycode, e) {
    if (! e.ctrlKey) {
      if (Ext.isIE) {
        e.browserEvent.keyCode = 8;
      }
      e.stopEvent();
      updateCasesTree();
    } 
    else 
      Ext.Msg.alert('Refresh', 'You clicked: CTRL-F5');
  }
});
 
Ext.onReady(function(){

  Ext.state.Manager.setProvider(new Ext.state.CookieProvider());

  var resetGrid = function() {  
    propStore.load();
  };

  var debugVariablesFilterDynaform = function(){
    propStore.load({params:{filter:'dyn'}});
  }

  var debugVariablesFilterSystem = function(){
    propStore.load({params:{filter:'sys'}});
  }
  
  var resetTriggers = function(){
    triggerStore.load();
  }
  
  propStore = new Ext.data.Store({
    proxy: new Ext.data.HttpProxy({url: 'debug_vars'}),
    reader: new Ext.data.DynamicJsonReader({root: 'data'})
  });
    
  propStore.on('load', function(){
    propStore.fields = propStore.recordType.prototype.fields;
    debugVariables.setSource(propStore.getAt(0).data);
  });


  var debugVariables = new Ext.grid.PropertyGrid({
    id: 'debugVariables',
    title:TRANSLATIONS.ID_VARIABLES,
    autoHeight: false,
    height: 300,
    width: 400,
    region: 'center',
    margins: '2 2 0 2',
    
    border: true,
    stripeRows: true,
    listeners: {
      beforeedit: function(event) { //Cancel editing - read only
        event.cancel = true;
      }
    }, 
    tbar: [
      {text: TRANSLATIONS.ID_ALL, handler: resetGrid},
      {text: TRANSLATIONS.ID_DYNAFORM, handler: debugVariablesFilterDynaform},
      {text: TRANSLATIONS.ID_SYSTEM, handler: debugVariablesFilterSystem}
    ],
    sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
    viewConfig: {
      forceFit: true
    }

  });
  
  //set debug variable details
  debugVariables.getSelectionModel().on('rowselect', function(sm, rowIdx, r) {
    var detailPanel = Ext.getCmp('debug-details-panel');
    debugVarTpl.overwrite(detailPanel.body, r.data);
    detailPanel.setTitle(r.data.name);
    //alert(r.data.name+' '+r.data.value);

    //
    if(r.data.value == '<object>' || r.data.value == '<array>' ){
      deatachAction.setDisabled(false);
      Ext.Ajax.request({
        url: 'debug_vars?r='+Math.random(),
        success: function(response){
          try{
            result = eval('('+response.responseText+')');
            
            var store1a = new Ext.data.ArrayStore({fields: result.headers});
              // manually load local data
              store1a.loadData(result.rows);
              
              var myGridPanel = new Ext.grid.GridPanel({
                store: store1a,
                height: 200,
                border : false,
                columns: result.columns,
                stripeRows : true,
                layout: 'fit',
                viewConfig:{forceFit:true, scrollOffset:0},
                listeners: {
                  rowdblclick: function(grid, n,e){
                    
                  },
                  render: function(){
                    this.loadMask = new Ext.LoadMask(this.body, { msg:'Loading...' });
                  }
                }
              });

              Ext.each(detailPanel.items.items, function(childPanel) {
                  detailPanel.remove(childPanel, true);

              });

              detailPanel.add(myGridPanel);
              detailPanel.doLayout();
          } catch (e){
            //alert(""+e);
          }
        },
        failure: function(){},
        params: {request: 'getRows', fieldname:r.data.name}
      });

     
    } else
      deatachAction.setDisabled(true);

  });
  
  centerPanel = {
    region: 'center', // a center region is ALWAYS required for border layout
    xtype:'panel',
    deferredRender: false,
    contentEl:'casesSubFrame'
  }


  /**
   * Menu Panel
   */
  var treeMenuItems = new Ext.tree.TreePanel({
    xtype: 'treepanel',
    height: 350,
    id: 'tree-panel',
    region: 'center',
    margins: '0 0 0 0',
    tbar: [
      {
        xtype: 'tbfill'
      },
      {
        id:'refreshNotifiers',
        xtype: 'tbbutton',
        cls: 'x-btn-icon',
        icon: '/images/refresh.gif',
        /*text: 'Reload notifiers',*/
        handler: function(){
          updateCasesTree();
          updateCasesView();
        }
      }
    ],
    animate:true,
    autoScroll: true,
    rootVisible: false,
    clearOnReLoad: false,
    root: new Ext.tree.AsyncTreeNode(),

    // Our custom TreeLoader:
    loader: new Ext.app.menuLoader({
      dataUrl:'casesMenuLoader',
      clearOnLoad: false
    }),

    listeners: {
    	'click': function(tp) {
        if( tp.attributes.url ){
          document.getElementById('casesSubFrame').src = tp.attributes.url;
        }
      } ,
      'render': function(tp){
    	  /*tp.getSelectionModel().on('selectionchange', function(tree, node){

          if( node.attributes.url ){
            document.getElementById('casesSubFrame').src = node.attributes.url;
          }
          //var el = Ext.getCmp('details-panel').body;
          if(node.attributes.tagName == 'option' && node.attributes.cases_count ){
            ReloadTreeMenuItemDetail({item:node.attributes.id});
            currentSelectedTreeMenuItem = node.attributes.id;
            Ext.getCmp('tree_menuItem_detail').setTitle(node.attributes.title.toUpperCase() + ' - Related processes: '+node.attributes.processes_count);
          } else {
            //el.update(detailsText);
            Ext.getCmp('tree_menuItem_detail').setTitle('');
            currentSelectedTreeMenuItem = null;
            ReloadTreeMenuItemDetail({item:''});
          }
        })*/
        
      }/*,
      'afterrender': {
        fn: setNode,
        scope: this
      }*/
      
    }
  });

  var loader = treeMenuItems.getLoader();
  loader.on("load", function(){
    document.getElementById('casesSubFrame').src = defaultOption;
    
      if( _nodeId != '' ){
        treePanel1 = Ext.getCmp('tree-panel')
        if(treePanel1)
          node = treePanel1.getNodeById(_nodeId);
        if(node)
          node.select();
        
      }
  });



  var treeMenuItemDetail = new Ext.tree.TreePanel({
      id: 'tree_menuItem_detail',
      region: 'south',
      animate:true,
      autoScroll:true,
      loader: new Ext.tree.TreeLoader({
        dataUrl:'casesMenuLoader?action=getProcess'
      }),
      enableDD:true,
      containerScroll: true,
      border: false,
      width: 250,
      height: 120,
      dropConfig: {appendOnly:true},
      collapsible: true,
      split: true,
      margins: '0 2 2 2',
      cmargins: '2 2 2 2',
      rootVisible: false,
      root: new Ext.tree.AsyncTreeNode()/*,
      tbar: [{
        text: 'reload',
        handler: ReloadTreeMenuItemDetail
      }]*/
  });

  ReloadTreeMenuItemDetail = function(params){
    treeMenuItemDetail.loader.dataUrl = 'casesMenuLoader?action=getProcess&item='+params.item;
    treeMenuItemDetail.root.reload();
  }

  // set the root node
  var root = new Ext.tree.AsyncTreeNode({
      text: 'Ext JS',
      draggable:false, // disable root node dragging
      id:'src',
      loaded:false,
      expanded:true
  });
  
  treeMenuItemDetail.setRootNode(root);

  mainMenu = new Ext.Panel({
    id:'menuTreePanel',
    title: '',
    region: 'west',
    layout: 'border',
    width: 200,
    height: 500,
    minSize: 175,
    maxSize: 400,
    split: true,
    collapsible: true,
    collapseMode: 'mini',
    margins: '0 0 0 2',
    items: [
      treeMenuItems,
      treeMenuItemDetail
    ]
  });

  /**
   * Triggers Panel
   */
  Ext.QuickTips.init();

  var xg = Ext.grid;
  
  var reader = new Ext.data.JsonReader(
    {
      root: 'data',
      totalProperty: 'total',
      id: 'name'
    }, 
    [
      {name: 'name'},
      {name: 'execution_time'},
      {name: 'code'}
    ]
  );

  triggerStore = new Ext.data.GroupingStore({
    reader: reader,
    sortInfo:{field: 'name', direction: "ASC"},
    groupField:'execution_time',
    proxy: new Ext.data.HttpProxy({url: 'debug_triggers?r='+Math.random()})
  });

  var debugTriggers = new xg.GridPanel({
      store: triggerStore,
      
      columns: [
        {id:'name',header: "Name", width: 60, sortable: true, dataIndex: 'name'},
        {header: "Execution", width: 30, sortable: true, dataIndex: 'execution_time'},
        {header: "Code", width: 30, sortable: false, dataIndex: 'code', hidden: true}
      ],

      view: new Ext.grid.GroupingView({
          forceFit:true,
          groupTextTpl: '{text} ({[values.rs.length]} {[ values.rs[0].data.execution_time=="error" || values.rs[0].data.execution_time=="Fatal error"? "<font color=red>"+values.rs[0].data.execution_time+"</font>":  values.rs.length > 1 ? "Triggers" : "Trigger"]})'
      }),

      width: 700,
      height: 450,
      title: TRANSLATIONS.ID_TRIGGERS,
      iconCls: 'icon-grid',
      tbar: [
        {text: TRANSLATIONS.ID_OPEN_IN_POPUP, handler: triggerWindow}
      ],
      sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
      viewConfig: {
        forceFit: true
      },
      listeners: {
        rowdblclick: function(grid, n,e){
          triggerWindow();
        }
      }
  });
  
  debugTriggers.getSelectionModel().on('rowselect', function(sm, rowIdx, r) {
    var detailPanel = Ext.getCmp('debug-details-panel');
    debugTriggersDetailTpl.overwrite(detailPanel.body, r.data);
  });
  
  function triggerWindow() {
    var r = debugTriggers.getSelectionModel().getSelected();
    if(r){
    var w = new Ext.Window({
      title: r.data.name,
      width: 500,
      height: 400,
      modal: true,
      autoScroll: true,
      maximizable: true,
      items: [],
      listeners:{
        show:function() {
          this.loadMask = new Ext.LoadMask(this.body, { msg:'Loading. Please wait...' });
        }
      }
    });
    w.show();

    debugTriggersDetailTpl.overwrite(w.body, r.data);
    }
  };


  var deatachAction = new Ext.Action({
    text: TRANSLATIONS.ID_DEATACH,
    handler: function(){
      var store1a = new Ext.data.ArrayStore({fields: result.headers});
      store1a.loadData(result.rows);
      
      for(i=0; i<result.columns.length; i++){
        result.columns[i].editor = new Ext.form.TextField({allowBlank: false, readOnly:true})
      }
      
      var myGridPanel = new Ext.grid.EditorGridPanel({
        region:'center',
        store: store1a,
        autoHeight: true,
        autoWidth: true,
        border : false,
        columns: result.columns,
        stripeRows : true,
        layout: 'fit',
        viewConfig:{forceFit:true, scrollOffset:0},
        clicksToEdit: 1
      });
      
      var w = new Ext.Window({
        title: '',
        width: 600,
        height: 250,
        layout:'fit',
        autoScroll:true,
        modal: true,
        
        maximizable: true,
        items: [
          
              myGridPanel
            
        ]
        });
      w.show();

    }
  });

  deatachAction.setDisabled(true);


  debugPanel = new Ext.Panel({
    id:'debugPanel',
    title: '',
    region: 'east',
    /*renderTo: 'tree',*/
    layout: 'border',
    width: 300,
    height: 500,
    minSize: 175,
    maxSize: 400,
    split: true,
    collapsible: true,
    collapseMode: 'mini',
    margins: '0 0 0 5',
    items: [
      new Ext.TabPanel({
        border: true, // already wrapped so don't add another border
        activeTab: 0, // second tab initially active
        tabPosition: 'top',
        region:'north',
        split: true,
        height:detailsdebugVariablesHeight,
        items: [
          debugVariables,
          debugTriggers
        ]
      }),
      {
        region: 'center',
        layout: 'fit',
        title: '',
        id: 'debug-details-panel',
        autoScroll: true,
        collapsible: false,
        split: true,
        margins: '0 2 2 2',
        cmargins: '2 2 2 2',
        height: detailsMenuTreePanelHeight,
        html: detailsText,
        tbar:[
          deatachAction
        ]
    }]  
  });
  
  
  var viewport = new Ext.Viewport({
    layout: 'border',
    items: [ mainMenu, centerPanel, debugPanel]
  });

  
  /** after panel creation routines */ 
  var menuPanelC = Ext.getCmp('debugPanel');
  //w.collapse();
  
  /**hide*/
  menuPanelC.hide(); 
  menuPanelC.ownerCt.doLayout(); 
  
  /**show*/
  //w.show();
  //w.ownerCt.doLayout();
  //w.expand();

  var menuPanelDetail = Ext.getCmp('tree_menuItem_detail');
  menuPanelDetail.hide(); 
  menuPanelDetail.ownerCt.doLayout();

  //the starting timer will be triggered after timerMinutes 
  setTimeout('Timer()', timerMinutes );
});

function updateCasesView() {
  try{
  	if (document.getElementById('casesSubFrame').contentWindow.storeCases) {
      document.getElementById('casesSubFrame').contentWindow.storeCases.reload();
    }
  } 
  catch(e){};
}

function updateCasesTree() {
  var result;
  var result1;
  
    //treeMenuItems.root.reload();
    Ext.getCmp('refreshNotifiers').setIcon('/skins/ext/images/default/grid/loading.gif');
    
    itemsTypes = Array('CASES_INBOX', 'CASES_DRAFT', 'CASES_CANCELLED', 'CASES_SENT', 'CASES_PAUSED', 'CASES_COMPLETED','CASES_SELFSERVICE');
    if(currentSelectedTreeMenuItem){
      ReloadTreeMenuItemDetail({item:currentSelectedTreeMenuItem});
    }
    Ext.Ajax.request({
      url: 'casesMenuLoader?action=getAllCounters&r='+Math.random(),
      success: function(response){
      	
	        result1 = response.responseText;
	        result = Ext.util.JSON.decode(result1);
	        
	        for(i=0; i<result.length; i++){
	        	if( document.getElementById('NOTIFIER_'+result[i].item ) ){
		          oldValue = document.getElementById('NOTIFIER_'+result[i].item).innerHTML;
		          oldValue = oldValue.replace('<b>', '');
		          oldValue = oldValue.replace('</b>', '');
		          
		          newValue = result[i].count;

		          if( oldValue != newValue && oldValue != 0 ){
		            document.getElementById('NOTIFIER_'+result[i].item).innerHTML = '<b>' + result[i].count + '</b>';
		            //NOTIFIER_FLAG = true;
		          } else { 
		          	//if(NOTIFIER_FLAG === false){
		              document.getElementById('NOTIFIER_'+result[i].item).innerHTML = result[i].count;
		            //}
		          }
		        } 
		        else continue;
	        }
	        Ext.getCmp('refreshNotifiers').setIcon('/images/refresh.gif');
	      
      },
      failure: function(){},
      params: {'updateCasesTree': true}
    });
  
}

//the timer function will be called after 2 minutes;
function Timer(){
  updateCasesView();
  setTimeout('Timer()', timerMinutes);
}

Ext.data.DynamicJsonReader = function(config){
  Ext.data.DynamicJsonReader.superclass.constructor.call(this, config, []);
};

Ext.extend(Ext.data.DynamicJsonReader, Ext.data.JsonReader, {
  getRecordType : function(data) {
    var i = 0, arr = [];

    for (var name in data[0]) {
      arr[i++] = name;
    } // is there a built-in to do this?
    this.recordType = Ext.data.Record.create(arr);
    return this.recordType;
  },
  readRecords : function(o){ // this is just the same as base class, with call to getRecordType injected

    this.jsonData = o;
    var s = this.meta;
    var sid = s.id;
    var totalRecords = 0;
    if(s.totalProperty){
      var v = parseInt(eval("o." + s.totalProperty), 10);
      if(!isNaN(v)){
        totalRecords = v;
      }
    }

    var root = s.root ? eval("o." + s.root) : o;
    var recordType = this.getRecordType(root);
    var fields = recordType.prototype.fields;
    var records = [];
    
    for(var i = 0; i < root.length; i++){
      var n = root[i];
        var values = {};
        var id = (n[sid] !== undefined && n[sid] !== "" ? n[sid] : null);
        for(var j = 0, jlen = fields.length; j < jlen; j++){
          var f = fields.items[j];
          var map = f.mapping || f.name;
          var v = n[map] !== undefined ? n[map] : f.defaultValue;
          v = f.convert(v);
          values[f.name] = v;
        }
        var record = new recordType(values, id);
        record.json = n;
        records[records.length] = record;
    }

    return {
      records : records,
      totalRecords : totalRecords || records.length
    };
  }
});

Ext.app.menuLoader = Ext.extend(Ext.ux.tree.XmlTreeLoader, {
  processAttributes : function(attr){
    //console.log(attr);
    if(attr.blockNestedTree){
      //console.log(attr);
      attr.text = attr.blockTitle;
      attr.iconCls = 'ICON_' + attr.id;
      attr.loaded = false;
      attr.expanded = false;
      attr.xtype = 'treepanel';
      attr.rootVisible = true,
      attr.singleClickExpand=true,
      attr.animate = true,
      attr.nodeType = 'async',
      attr.clearOnReLoad= false,

      attr.loader = new Ext.tree.TreeLoader( {
						dataUrl : attr.blockNestedTree,
						baseParams : {
							action : 'expandNode',
							folderID: attr.folderId
						}});
		 attr.style= {
            // width: '50%',
            height: '50px',
            // marginBottom: '10px',
            overflow:'auto'
        };
                 
				      
    }else if(attr.blockHeaderNoChild){
        //console.info(attr);
        attr.text = attr.blockTitle;
        attr.iconCls = 'ICON_' + attr.id;
        attr.loaded = true;
        attr.expanded = false;
        //attr.disabled=true;
        attr.expandable=true;
        attr.qtip=attr.blockTitle;
         
        				      
      }else if(attr.blockTitle){
      attr.text = attr.blockTitle;
      attr.iconCls = 'ICON_' + attr.id;
      attr.loaded = true;
      //if((attr.url)&&(attr.url!="")){
      //	attr.expanded = false;
      //}else{
    	  attr.expanded = true;
      //}
    }else if(attr.title){ 
      attr.text = attr.title;
      if( attr.cases_count )
        attr.text += ' (<label id="NOTIFIER_'+attr.id+'">' + attr.cases_count + '</label>)';
      
      attr.iconCls = 'ICON_' + attr.id;
      attr.loaded = true;
      attr.expanded = false;

    } else if(attr.PRO_UID){
      attr.loaded = true;
      attr.leaf = true;
    }
  }
});

function setDefaultOption(){
  //document.getElementById('casesSubFrame').src = "casesListExtJs";
}

var notify = function(title, msg){
  PMExt.notify(title, msg);
}
