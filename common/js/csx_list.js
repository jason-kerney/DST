
// Dynamic List Control

function csx_list(context, addItemCallback){
	
	// Default the context if not set
	if (!context) context = document;

    // Initialize globals
    var mover = null;
    var onHandle = false;

	// Generic utility digit padding function
	function padDigits(value, digits){
		value = value.toString();
		while (value.length < digits)
			value = '0' + value;
			
		return value;
	}
	
	// Utility function to get an element's page height
	function getOffset(element){
		var offsetX = 0;
		var offsetY = 0;
		while (element && !isNaN(element.offsetTop)){
			//offsetX += element.offsetLeft - element.scrollLeft;
			//offsetY += element.offsetTop - element.scrollTop;
			offsetX += element.offsetLeft;
			offsetY += element.offsetTop;
			element = element.offsetParent;
		}
		return {'x':offsetX,'y':offsetY};
	}
	
	// Utility function for finding the owning list
	function getOwningList(node){
		while (node.parentNode){
			node = node.parentNode;
			if (node.className){
				if (node.className.match(/list_/))
					return node;
			}
		}
		return false;
	}
	
	// Utility function to find the owning page
	function getOwningPage(node){
		while (node.parentNode){
			node = node.parentNode;
			if (node.className){
				if (node.className.match(/page_/))
					return node;
			}
		}
		return false;
	}
	
    // Convert each list
	var lists = context.querySelectorAll('.list');
	for (var listIndex = 0; listIndex < lists.length; listIndex++){

		// Handling for scripted columnation
		lists[listIndex].columns = lists[listIndex].querySelectorAll('.column');
		lists[listIndex].autoBalance = function(){return false;};
		for (var i = 0; i < lists[listIndex].columns.length; i++)
			lists[listIndex].columns[i].colNum = i;
		
		// Handle loading and conversion of old data format
		lists[listIndex].load = function(){

			// Get and parse the data from the new-type storage field
			var listName = this.className.match(/list_([\w\d_]+)/)[1];
			var dataString = this.querySelector('.dsf_' + listName).innerHTML;
			
			// Manually clean up all the unhandled string escaping
			dataString = dataString.replace(/"\\/g,'\"');
			dataString = dataString.replace(/=\"\"/g,'=\"\"');
			dataString = dataString.replace(/&lt;/g,'<');
			dataString = dataString.replace(/&gt;/g,'>');
			dataString = dataString.replace(/<[/]*span[^>]*>/g,'');
			dataString = dataString.replace(/<[/]*font[^>]*>/g,'');
			dataString = dataString.replace(/<b[^>r]*>/g,'<b>');	
			
			var listData = (dataString) ? JSON.parse(dataString) : [];

			// Add on to the end any data stored in the old way
			var oldStructure = this.querySelector('.oldfields').innerHTML;
			if (oldStructure){
				var oldLists = JSON.parse(oldStructure);
				
				// Harvest data for each list to be merged in
				for (var oldListIndex = 0; oldListIndex < oldLists.length; oldListIndex++){
					var oldFields = oldLists[oldListIndex];
					var oldItemIndex = 0;
					
					// Search the saved data for items coresponding to the list's first field
					while (dynamic_sheet_attrs[oldFields[Object.keys(oldFields)[0]] + '_' + padDigits(oldItemIndex,2)] != undefined){
						var newItemData = {};
						
						// Get the data for each field once an item is found
						for (var newFieldName in oldFields){
							var oldFieldName  = oldFields[newFieldName] + '_' + padDigits(oldItemIndex,2);
							newItemData[newFieldName] = dynamic_sheet_attrs[oldFieldName];
							// Clean up busticated data from old implementation
							if(newItemData[newFieldName] == undefined || newItemData[newFieldName] == 'undefined')
								newItemData[newFieldName] = '';
						}
						
						// Add the new item to the complete item array
						listData[listData.length] = newItemData;
						oldItemIndex++;
					}
				}
			}
		
			// If saved data exists then clear and render
			if (listData.length){
				this.clear();
				this.render(listData);
			}
			
		}
		
		// Core function to clear the list of pre-existing data
		lists[listIndex].clear = function(){
			var items = this.querySelectorAll('li.item');
			for (var itemIndex = 0; itemIndex < items.length; itemIndex++){
				if (!items[itemIndex].className.match(/proto/)){
					this.removeChild(items[itemIndex]);
				}
			}
		}
	
		// Core function to load list data from JSON string
		lists[listIndex].render = function(listData){
			
			// Add the contents of the object to the list
			var rebalance = false;
			for (var itemIndex = 0; itemIndex < listData.length; itemIndex++){
				// Rebalance after render if missing any column specifications
				if (listData[itemIndex].column == undefined)
					rebalance = true;
				this.addItem(listData[itemIndex]);
			}
			if (rebalance && this.columns.length)
				this.balanceColumns();
			
		}
		
		// Core function to extract and save list data
		lists[listIndex].unrender = function(){
			
			// Walk the list harvesting data into an object
			var listData = [];
			var items = this.querySelectorAll('li.item');
			for (var itemIndex = 0; itemIndex < items.length; itemIndex++){
				if (!items[itemIndex].className.match(/proto/)){
					var itemData = {};
					var fields = items[itemIndex].querySelectorAll('.dslf');
					for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++){
						var fieldName = fields[fieldIndex].className.match(/dslf_([\w\d_]+)/)[1];
						var fieldValue = fields[fieldIndex].innerHTML;
						itemData[fieldName] = fieldValue;
					}
					if (this.columns.length)
						itemData.column = items[itemIndex].parentNode.colNum;
					listData[listData.length] = itemData;
				}
			}
			
			// Stringify the object and put it to the save field
			var listName = this.className.match(/list_([\w\d_]+)/)[1];
			var dataString = JSON.stringify(listData);
			this.querySelector('.dsf_' + listName).innerHTML = dataString;
			
		}

		// Callback function for post-add processing
		if (csx_opts.setupCallback)
			lists[listIndex].itemAdded = csx_opts.setupCallback;
		else
			lists[listIndex].itemAdded = function(){};
		
		// Core function to add an item to the list
		lists[listIndex].addItem = function(data){
			
			// Clone the embeded prototype as a basis
			var proto = this.querySelector('.proto');
			var newItem = proto.cloneNode(true);
			
			// Initialize the new item
			newItem.className = newItem.className.replace(/proto/g,'');
			
			// Inject any provided data into the item
			if (data){
				var fields = newItem.querySelectorAll('.dslf');
				for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++){
					var fieldName = fields[fieldIndex].className.match(/dslf_([\w\d_]+)/)[1];
					if (fieldName in data)
						fields[fieldIndex].innerHTML = data[fieldName];
				}
			}
			
			// Place and enable the new item
			if (this.columns.length){
				if (data){
					if (data.column != undefined){
						// Put it in the right column if specified
						this.columns[data.column].appendChild(newItem);
					}
					else{
						// ERROR CASE: default to last column
						this.lastColumn.appendChild(newItem);
					}
				}
				else{
					// Put new items in the lat column
					this.lastColumn.appendChild(newItem);
				}
			}
			else{
				// Put it right in the list if there are no columns
				this.appendChild(newItem);
			}
			
			this.makeDragable(newItem);
			this.itemAdded(newItem);
			
			// Autobalance the list if enabled
			if (this.autoBalance())
				this.balanceColumns();
		
		}

		// Core function to make an item dragable
		lists[listIndex].makeDragable = function(item){
			item.draggable = true;
			
			// Prevent drag when interacting with editable text
			var textFields = item.querySelectorAll('[contentEditable=true]');
			for (var fieldIndex = 0; fieldIndex < textFields.length; fieldIndex++){
				textFields[fieldIndex].addEventListener('mousedown', function(e){
					this.parentNode.draggable = false;
					this.addEventListener('mouseup', function(e){
						this.parentNode.draggable = true;
					}, false);
					this.addEventListener('mouseout', function(e){
						this.parentNode.draggable = true;
					}, false);
				}, false);
			}
			
			// Designate to higher scope when mousing a drag handle
			var dragHandle = item.querySelector('.handle');
			dragHandle.title = 'Drag to rearrange list';
			dragHandle.addEventListener('mousedown', function (e) {
				onHandle = true;
				var handle = this;
				
				this.mouseup = function(e){
					onHandle = false;
					handle.clearEvents();
				}
				this.addEventListener('mouseup', this.mouseup, false);
				
				this.mouseout = function(e){
					this.handleTimeout = window.setTimeout(function(){
						onHandle = false;
						handle.clearEvents();
					},5);
				}
				this.addEventListener('mouseout', this.mouseout, false);
				
				this.mouseover = function(e){
					window.clearTimeout(handle.handleTimeout);
				}
				this.addEventListener('mouseover', this.mouseover, false);
				
				this.clearEvents = function(){
					this.removeEventListener('mouseup',this.mouseup);
					this.removeEventListener('mouseout',this.mouseout);
					this.removeEventListener('mouseover',this.mouseover);
				};
				
			}, false);
			
			// Apply event listener for when draging begins
			item.addEventListener('dragstart', function (e) {
				// Do nothing unless we're grabbing the handle
				if (onHandle) {
				
					// Declare the action being taken
					e.dataTransfer.effectAllowed = 'move';
					e.dataTransfer.setData('Text', this.id);
					
					// Flag the item in motion up in scope
					mover = this;
				
					// Apply styling class to the thing moving
					this.className += ' source';
					
					// Put the parent in the context
					var parentList = getOwningList(this);
					
					// Highlight all the trash drops
					var trash = document.querySelectorAll('.trash');
					for (var trashIdx = 0; trashIdx < trash.length; trashIdx++){
						trash[trashIdx].className += ' active';
					}
					
					// Disable all contentEditables in the list
					var edits = parentList.querySelectorAll('[contentEditable=true]');
					for(var fieldIndex = 0; fieldIndex < edits.length; fieldIndex++)
						edits[fieldIndex].contentEditable = false;
					
					// Apply the cleanup event handler
					this.addEventListener('dragend', function (e) {
					
						// Mark us as off the drag handle
						onHandle = false;
						
						// Remove grab handle events
						this.querySelector('.handle').clearEvents();
						
						// Remove events from the rest of the list
						var listItems = parentList.querySelectorAll('li.item');
						for (var itemIndex = 0; itemIndex < listItems.length; itemIndex++){
							var li = listItems[itemIndex];
							li.removeEventListener('dragenter', li.dragenterFunc, false);
							li.removeEventListener('dragover', li.dragoverFunc, false);
							li.removeEventListener('dragleave', li.dragleaveFunc, false);
							li.removeEventListener('drop', li.dropFunc, false);
						}

						// Strip styling classes
						this.className = this.className.replace(/[\s]*source/g,'');
						
						// Un-highlight all the trash drops
						var trash = document.querySelectorAll('.trash');
						for (var trashIdx = 0; trashIdx < trash.length; trashIdx++){
							trash[trashIdx].className = trash[trashIdx].className.replace(/[\s]*active/g,'');
						}
						
						// Remove this event handler
						this.ondragend = false;
						
						// Autobalance the list if enabled
						if (parentList.autoBalance())
							parentList.balanceColumns();
						
						// Reenable editing by the power of closures
						for(var fieldIndex = 0; fieldIndex < edits.length; fieldIndex++)
							edits[fieldIndex].contentEditable = true;
					}, false);
					
					var listItems = getOwningList(this).querySelectorAll('li.item');
					for (var itemIndex = 0; itemIndex < listItems.length; itemIndex++){
					
						var li = listItems[itemIndex];
					
						// Style potential drop targets as they're moved over
						li.dragUpdateFunc = function (e) {
							// Prevent response from the origenal item in the list
							if(this == mover) return false;
							
							// Apply styling class to potential drop targets
							var offset = getOffset(this);
							var verticalPosition = (e.pageY - offset.y) / this.offsetHeight;
							if (verticalPosition < 0.5){
								this.className = this.className.replace(/[\s]*over-below/g,'');
								this.className += ' over-above';
							}
							else{
								this.className = this.className.replace(/[\s]*over-above/g,'');
								this.className += ' over-below';
							}
							return false;
						};
						li.dragenterFunc = function (e) {
							this.dragUpdateFunc(e);
						}
						li.addEventListener('dragenter', li.dragenterFunc, false);
						li.dragoverFunc = function (e) {
							// Cancel removal of styling class after leaving an element
							// if it was internal to the draggable item itself
							window.clearTimeout(this.leaveTimer);
							
							// Update the styling for above / below insertion
							this.dragUpdateFunc(e);
							
							// Cancel the default behavior of the drag
							if (e.preventDefault) e.preventDefault();
							return false;
						};
						li.addEventListener('dragover', li.dragoverFunc, false);
						li.dragleaveFunc = function (e) {
							// Schedule styling class cleanup if not canceled
							var leaveTarget = this;
							this.leaveTimer = window.setTimeout(function(){
								leaveTarget.className = leaveTarget.className.replace(/[\s]*over-above/g,'');
								leaveTarget.className = leaveTarget.className.replace(/[\s]*over-below/g,'');
							}, 5);
						};
						li.addEventListener('dragleave', li.dragleaveFunc, false);
						
						// Apply event listeners for dropping the item
						li.dropFunc = function (e) {
							// Prevent response if dropping on itself
							if (this == mover) return;
							
							// Insert the moved item above or below the target
							var offset = getOffset(this);
							var verticalPosition = (e.pageY - offset.y) / this.offsetHeight;
							if (verticalPosition < 0.5)
								this.parentNode.insertBefore(mover,this);
							else{
								if (this.nextSibling)
									this.parentNode.insertBefore(mover,this.nextSibling);
								else
									this.parentNode.appendChild(mover);
							}
							
							// Remove the styling class from the target
							this.className = this.className.replace(/[\s]*over-above/g,'');
							this.className = this.className.replace(/[\s]*over-below/g,'');
							
							// Stop the default events from occuring
							if (e.stopPropagation) e.stopPropagation();
							return false;
						};
						li.addEventListener('drop', li.dropFunc, false);
					
					}
					
				}
				else {
					e.preventDefault();
				}
			}, false);
		
		};
		
		// Only set up columns if there's more than one
		if (lists[listIndex].columns.length){
		
			// Shortcut to the last column
			lists[listIndex].lastColumn = lists[listIndex].columns[lists[listIndex].columns.length - 1];

			// Calculate the pixel height of the list's content
			lists[listIndex].contentHeight = function(){
				var items = this.querySelectorAll('li.item:not(.proto)');
				var height = 0;
				for (var i = 0; i < items.length; i++)
					height += items[i].offsetHeight;
				return height;
			}
			
			// Distribute list items between columns
			lists[listIndex].balanceColumns = function(){
				var items = this.querySelectorAll('li.item:not(.proto)');
				var colHeight = 0;
				var currentCol = 0;

				// Determine the ideal column height
				var idealHeight = this.contentHeight() / this.columns.length;
					
				// Tally up the height of the items
				for (var i = 0; i < items.length; i++){
					if (colHeight >= idealHeight){
						colHeight = 0;
						currentCol++;
					}
					this.columns[currentCol].appendChild(items[i]);
					colHeight += items[i].offsetHeight;
				}
				
			}
			
		}
		
		// Apply dragability to each item on the list
		if (csx_opts.isEditable){
			var items = lists[listIndex].querySelectorAll('li.item');
			for (var itemIndex = 0; itemIndex < items.length; itemIndex++)
				lists[listIndex].makeDragable(items[itemIndex]);
		}
			
		// Load any existing saved data
		lists[listIndex].load();
		
	}
	
	// Convert each add button
	var addButtons = context.querySelectorAll('.add');
	for (var addIndex = 0; addIndex < addButtons.length; addIndex++){
		
		var button = addButtons[addIndex];
		var listName = button.className.match(/addto_([\w\d]+)/)[1];
		
		if (!button.title)
			button.title = 'Add list item';

		button.listOwner = context.querySelector('.list_' + listName);
		button.addEventListener('mouseup', function (e) {
			this.listOwner.addItem();
		});
		
	}
	
	// Convert each balance button
	var balanceButtons = context.querySelectorAll('.balance');
	for (var balanceIndex = 0; balanceIndex < balanceButtons.length; balanceIndex++){
	
		var button = balanceButtons[balanceIndex];
		var listName = button.className.match(/balance_([\w]+)/)[1];
		
		if (!button.title)
			button.title = 'Balance list columns';
		
		button.listOwner = context.querySelector('.list_' + listName);
		button.addEventListener('mouseup', function (e) {
			this.listOwner.balanceColumns();
		});
	
	}
	
	// Hook up each auto-balance toggle
	var autoButtons = context.querySelectorAll('.autobalance');
	for (var autoIndex = 0; autoIndex < autoButtons.length; autoIndex++){
		
		var button = autoButtons[autoIndex];
		var listName = button.className.match(/autobalance_([\w]+)/)[1];
		var listOwner = context.querySelector('.list_' + listName);
		listOwner.autoBalanceToggle = autoButtons[autoIndex];
		listOwner.autoBalance = function(){
			if (this.autoBalanceToggle.value() == 1)
				return true;
			else
				return false;
		}

		button.title = 'Auto-balance columns';
		
	}
	
	// Convert each trash drop
	var trashBins = context.querySelectorAll('.trash');
	for (var trashIndex = 0; trashIndex < trashBins.length; trashIndex++){
	
		// Set up the trash drop point
		var trash = trashBins[trashIndex];
		trash.title = 'Drag here to delete';

		// Style the trash drop point as the item moves over it
		trash.addEventListener('dragenter', function (e) {
			this.className += ' over';
			return false;
		}, false);
		trash.addEventListener('dragover', function (e) {
			// Cancel removal of styling class after leaving an element
			// if it was internal to the draggable item itself
			window.clearTimeout(this.leaveTimer);
			
			// Cancel the default behavior of the drag
			if (e.preventDefault) e.preventDefault();
			return false;
		}, false);
		trash.addEventListener('dragleave', function () {
			// Schedule styling class cleanup if not canceled
			var leaveTarget = this;
			this.leaveTimer = window.setTimeout(function(){
				leaveTarget.className = leaveTarget.className.replace(/[\s]*over/g,'');
			}, 5);
		}, false);
		
		// Remove the item being moved if dropped in the trash
		trash.addEventListener('drop', function (e) {
			// Remove the moving item itself
			mover.parentNode.removeChild(mover);
			
			// Remove the styling class from the trash
			this.className = this.className.replace(/[\s]*over/g,'');
			
			// Stop the default events from occuring
			if (e.stopPropagation) e.stopPropagation();
			return false;
		}, false);
	
	}
}