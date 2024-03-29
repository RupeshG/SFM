(function () {
	// Private objects & functions
	var _inherit = (function () {
		function _() { }
		return function (child, parent) {
			_.prototype = parent.prototype;
			child.prototype = new _;
			child.prototype.constructor = child;
			child.superproto = parent.prototype;
			return child;
		};
	})();
	var _addProperty = function (obj, name, writable, value) {
		if (!obj._privVals)
			obj._privVals = {};
		if (!obj.propertyChanged)
			obj.propertyChanged = new _Event(obj);

		if (value != undefined)
			obj._privVals[name] = value;
		var propDef = { get: function () { return obj._privVals[name]; }, enumerable: true };
		if (writable) {
			propDef.set = function (newVal) {
				if (obj._privVals[name] != newVal) {
					obj._privVals[name] = newVal;
					obj.propertyChanged.raise(name);
				}
			};
		}
		Object.defineProperty(obj, name, propDef);
	};
	var _bindHandler = function (handler, handlers, bind, scope) {
		if (bind || typeof bind == "undefined") {
			handlers.push({ handler: handler, scope: (scope ? scope : null) });
		}
		else {
			var index = 0;
			while (index < handlers.length) {
				if (handlers[index].handler === handler) {
					handlers.splice(index, 1);
				}
				else {
					index++;
				}
			}
		}
	};
	var _callHandlers = function (handlers) {
		var params = [];
		var i = 1;
		while (arguments[i])
			params.push(arguments[i++]);

		var result = false;
		for (var index in handlers) {
			var handlerDescriptor = handlers[index];
			if (handlerDescriptor.handler) {
				var thisResult = handlerDescriptor.handler.apply(handlerDescriptor.scope, params);
				if (thisResult != false)
					result = result || thisResult;
			}
		}
		return result;
	}
	var _Event = function (sender) {
		var _handlers = [],
			_handlersToRemove = [],
			_bRaisingEvent = false;


		this.add = function (handler, target) {
			var bExists = false;

			for (var index in _handlers) {
				var h = _handlers[index];
				if (h.handler == handler && h.target == target) {
					bExists = true;
					break;
				}
			}
			if (!bExists) {
				_handlers.push({ handler: handler, target: target });
			}
		}

		this.remove = function (handler, target) {
			var index = 0;

			while (index < _handlers.length) {
				var h = _handlers[index];

				if ((!handler || h.handler == handler) && (!target || h.target == target)) {
					if (!_bRaisingEvent) {
						_handlers.splice(index, 1);
						index--;
					}
					else {
						_handlersToRemove.push(h);
					}
				}
				index++;
			}
		}

		this.clear = function () {
			if (!_bRaisingEvent) {
				_handlers = [];
			}
			else {
				_handlersToRemove = _handlers.slice(0);
			}
		}

		this.raise = function (eventArgs) {
			// Make sure every handler is called in raise(), if any handler is removed while in 'for' cycle, remove it after the loop finishes
			_bRaisingEvent = true;

			for (index in _handlers) {
				var h = _handlers[index];
				h.handler.call(h.target ? h.target : sender, eventArgs, sender);
				if (eventArgs && eventArgs.cancel) {
					break;
				}
			}

			_bRaisingEvent = false;

			for (index in _handlersToRemove) {
				var hToRemove = _handlersToRemove[index];
				this.remove(hToRemove.handler, hToRemove.target);
			}
		}
	};

	if (typeof MobileCrmException === "undefined") {
		MobileCrmException = function (msg) {
			this.message = msg;
			this.name = "MobileCrmException";
		};
		MobileCrmException.prototype.toString = function () { return this.message; };
	}

	// MobileCRM object definition
	if (typeof MobileCRM === "undefined") {
		MobileCRM = {
			/// <summary>An entry point for Mobile CRM data model.</summary>
			/// <field name="bridge" type="String">Singleton instance of <see cref="MobileCRM.Bridge">MobileCRM.Bridge</see> providing the management of the Javascript/C# cross-calls.</field>
			bridge: null,

			Bridge: function (platform) {
				/// <summary>The <strong>MobileCRM.Bridge</strong> object provides the management of the Javascript/C# cross-calls. Its only instance <see cref="MobileCRMbridge">MobileCRM.bridge</see> is created immediately after the &quot;JSBridge.js&quot; script is loaded.</summary>
				/// <param name="platform" type="String">A platform name</param>
				/// <field name="platform" type="String">A string identifying the device platform (e.g. Android, iOS, Windows, WP7).</field>
				/// <field name="version" type="Number">A number identifying the version of the JSBridge. This is the version of the script which might not match the version of the C# bridge implemented by application.</field>
				this.commandQueue = [];
				this.processing = false;
				this.callbacks = {};
				this.callbackId = 0;
				this.version = 4;
				this.platform = platform;
			},

			Configuration: {
			},

			Localization: {
				stringTable: {}
			},

			Reference: function (entityName, id, primaryName) {
				/// <summary>Analogy of the IReference C# interface providing the minimum information about an entity.</summary>
				/// <param name="entityName" type="String">The logical name of the reference, e.g. "account".</param>
				/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
				/// <param name="primaryName" type="String">The human readable name of the reference, e.g "Alexandro".</param>
				/// <field name="entityName" type="String">The logical name of the reference, e.g. "account".</field>
				/// <field name="id" type="String">GUID of the existing entity or null for new one.</field>
				/// <field name="isNew" type="Boolean">Indicates whether the entity is newly created.</field>
				/// <field name="primaryName" type="String">The human readable name of the reference, e.g. "Alexandro".</field>
				this.entityName = entityName;
				this.id = id;
				this.isNew = (id ? false : true);
				this.primaryName = primaryName;
			},

			DynamicEntity: function (entityName, id, primaryName, properties, isOnline) {
				/// <summary>Analogy of the DynamicEntity C# class representing an entity, with only a subset of properties loaded.</summary>
				/// <remarks>This class is derived from <see cref="MobileCRM.Reference">MobileCRM.Reference</see></remarks>
				/// <param name="entityName" type="String">The logical name of the entity, e.g. "account".</param>
				/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
				/// <param name="primaryName" type="String">The human readable name of the entity, e.g "Alexandro".</param>
				/// <param name="properties" type="Object">An object with entity properties, e.g. {firstname:"Alexandro", lastname:"Puccini"}.</param>
				/// <param name="isOnline" type="Boolean">Indicates whether the entity was created by online request or from local data.</param>
				/// <field name="entityName" type="String">The logical name of the entity, e.g. "account".</field>
				/// <field name="id" type="String">GUID of the existing entity or null for new one.</field>
				/// <field name="isNew" type="Boolean">Indicates whether the entity is newly created.</field>
				/// <field name="isOnline" type="Boolean">Indicates whether the entity was created by online request or from local data.</field>
				/// <field name="primaryName" type="String">The human readable name of the entity, e.g. "Alexandro".</field>
				/// <field name="properties" type="Object">An object with entity properties, e.g. {firstname:"Alexandro", lastname:"Puccini"}.</field>
				MobileCRM.DynamicEntity.superproto.constructor.apply(this, arguments);
				this.isOnline = isOnline;
				this.properties = properties ? new MobileCRM.ObservableObject(properties) : {};
			},

			Metadata: {
				entities: null
			},

			MetaEntity: function (props) {
				/// <summary>Analogy of the MetaEntity C# class representing an entity metadata.</summary>
				MobileCRM.MetaEntity.superproto.constructor.apply(this, arguments);
			},

			FetchXml: {
				Fetch: function (entity, count, page) {
					/// <summary>Represents a FetchXml query object.</summary>
					/// <param name="entity" type="MobileCRM.FetchXml.Entity">An entity object.</param>
					/// <param name="count" type="int">the maximum number of records to retrieve.</param>
					/// <param name="page" type="int">1-based index of the data page to retrieve.</param>
					/// <field name="aggregate" type="int">Indicate whether the fetch is aggregated.</field>
					/// <field name="count" type="int">the maximum number of records to retrieve.</field>
					/// <field name="entity" type="MobileCRM.FetchXml.Entity">An entity object.</field>
					/// <field name="page" type="int">1-based index of the data page to retrieve.</field>
					this.entity = entity;
					this.count = count;
					this.page = page;
					this.aggregate = false;
				},
				Entity: function (name) {
					/// <summary>Represents a FetchXml query root entity.</summary>
					/// <param name="name" type="String">An entity logical name.</param>
					/// <field name="attributes" type="Array">An array of <see cref="MobileCRM.FetchXml.Attribute">MobileCRM.FetchXml.Attribute</see> objects.</field>
					/// <field name="filter" type="MobileCRM.FetchXml.Filter">A query filter.</field>
					/// <field name="linkentities" type="Array">An array of <see cref="MobileCRM.FetchXml.LinkEntity">MobileCRM.FetchXml.LinkEntity</see> objects.</field>
					/// <field name="name" type="String">An entity logical name.</field>
					/// <field name="order" type="Array">An array of <see cref="MobileCRM.FetchXml.Order">MobileCRM.FetchXml.Order</see> objects.</field>
					this.name = name;
					this.attributes = [];
					this.order = [];
					this.filter = null;
					this.linkentities = [];
				},
				LinkEntity: function (name) {
					/// <summary>Represents a FetchXml query linked entity.</summary>
					/// <remarks>This object is derived from <see cref="MobileCRM.FetchXml.Entity">MobileCRM.FetchXml.Entity</see></remarks>
					/// <field name="alias" type="String">A link alias.</field>
					/// <field name="from" type="String">The "from" field (if parent then target entity primary key).</field>
					/// <field name="linkType" type="String">The link (join) type ("inner" or "outer").</field>
					/// <param name="name" type="String">An entity name</param>
					/// <field name="to" type="String">The "to" field.</field>
					MobileCRM.FetchXml.LinkEntity.superproto.constructor.apply(this, arguments);

					this.from = null;
					this.to = null;
					this.linktype = null;
					this.alias = null;
				},
				Attribute: function (name) {
					/// <summary>Represents a FetchXml select statement (CRM field).</summary>
					/// <param name="name" type="String">A lower-case entity attribute name (CRM logical field name).</param>
					/// <field name="aggregate" type="String">An aggregation function.</field>
					/// <field name="alias" type="String">Defines an attribute alias.</field>
					/// <field name="dategrouping" type="String">A date group by modifier (year, quarter, month, week, day).</field>
					/// <field name="groupby" type="Boolean">Indicate whether to group by this attribute.</field>
					/// <field name="name" type="String">A lower-case entity attribute name (CRM logical field name).</field>
					this.name = name;
					this.aggregate = null;
					this.groupby = false;
					this.alias = null;
					this.dategrouping = null;
				},
				Order: function (attribute, descending) {
					/// <summary>Represents a FetchXml order statement.</summary>
					/// <param name="attribute" type="String">An attribute name (CRM logical field name).</param>
					/// <param name="descending" type="Boolean">true, for descending order; false, for ascending order</param>
					/// <field name="alias" type="String">Defines an order alias.</field>
					/// <field name="attribute" type="String">An attribute name (CRM logical field name).</field>
					/// <field name="descending" type="Boolean">true, for descending order; false, for ascending order.</field>
					this.attribute = attribute;
					this.alias = null;
					this.descending = descending ? true : false;
				},
				Filter: function () {
					/// <summary>Represents a FetchXml filter statement. A logical combination of <see cref="Condition"/> and child-filters.</summary>
					/// <field name="conditions" type="Array">An array of <see cref="MobileCRM.FetchXml.Condition"/> objects.</field>
					/// <field name="filters" type="Array">An array of <see cref="MobileCRM.FetchXml.Filter"/> objects representing child-filters.</field>
					/// <field name="type" type="String">Defines the filter operator ("or" / "and").</field>
					this.type = null;
					this.conditions = [];
					this.filters = [];
				},
				Condition: function () {
					/// <summary>Represents a FetchXml attribute condition statement.</summary>
					/// <field name="attribute" type="String">The attribute name (CRM logical field name).</field>
					/// <field name="operator" type="String">The condition operator. "eq", "ne", "lt", "le", "gt", "ge", "like"</field>
					/// <field name="uiname" type="String">The lookup target entity display name.</field>
					/// <field name="uitype" type="String">The lookup target entity logical name.</field>
					/// <field name="value" type="">The value to compare to.</field>
					/// <field name="values" type="Array">The list of values to compare to.</field>
					this.attribute = null;
					this.operator = null;
					this.uitype = null;
					this.uiname = null;
					this.value = null;
					this.values = [];
				}
			},

			Platform: function (props) {
				/// <summary>Represents the Javascript equivalent of managed Platform object for querying platform specific information and executing platform integrated actions.</summary>
				/// <remarks>This object cannot be created directly. To obtain/modify this object, use <see cref="MobileCRM.Platform.requestObject">MobileCRM.Platform.requestObject</see> function.</remarks>
				/// <field name="capabilities" type="Number">Gets the mask of capability flags supported by this device (MakePhoneCalls=1; HasMapView=2).</field>
				/// <field name="deviceIdentifier" type="String">Gets the unique identifier of this device.</field>
				/// <field name="screenWidth" type="Number">Gets the current screen width in pixels.</field>
				/// <field name="screenHeight" type="Number">Gets the current screen width in pixels.</field>
				/// <field name="screenDensity" type="Number">Gets the screen density (DPI).</field>
				/// <field name="isTablet" type="Boolean">Indicates whether this device is tablet.</field>
				/// <field name="customImagePath" type="String">Gets or sets the custom image path that comes from customizations.</field>
				MobileCRM.Platform.superproto.constructor.apply(this, arguments);
			},

			UI: {
				FormManager: {
				},
				EntityForm: function (props) {
					/// <summary>Represents the Javascript equivalent of managed entity form object.</summary>
					/// <remarks>This object cannot be created directly. To obtain/modify this object, use <see cref="MobileCRM.UI.EntityForm.requestObject">MobileCRM.UI.EntityForm.requestObject</see> function.</remarks>
					/// <field name="associatedViews" type="Array">Gets the associated views as an array of <see cref="MobileCRM.UI._EntityList">MobileCRM.UI._EntityList</see> objects.</field>
					/// <field name="canEdit" type="Boolean">Gets whether the form can be edited.</field>
					/// <field name="canClose" type="Boolean">Determines if form can be closed, i.e. there are no unsaved data being edited.</field>
					/// <field name="controllers" type="Array">Gets the form controllers (map, web) as an array of <see cref="MobileCRM.UI._Controller">MobileCRM.UI._Controller</see> objects.</field>
					/// <field name="detailViews" type="Array">Gets the detailView controls  as an array of <see cref="MobileCRM.UI._DetailView">MobileCRM.UI._DetailView</see> objects.</field>
					/// <field name="entity" type="MobileCRM.DynamicEntity">Gets or sets the entity instance the form is showing.</field>
					/// <field name="form" type="MobileCRM.UI._Form">Gets the top level form.</field>
					/// <field name="isDirty" type="Boolean">Indicates whether the form  has unsaved data.</field>
					/// <field name="visible" type="Boolean">Gets whether the underlying form is visible.</field>
					MobileCRM.UI.EntityForm.superproto.constructor.apply(this, arguments);
				},

				ViewController: function () {
					/// <summary>Represents the Javascript equivalent of view controller (map/web content).</summary>
				},

				_DetailView: function (props) {
					/// <summary>Represents the Javascript equivalent of detail view with set of items responsible for fields editing.</summary>
					/// <field name="isDirty" type="Boolean">Indicates whether the value of an item has been modified.</field>
					/// <field name="isEnabled" type="Boolean">Gets or sets whether the all items are enabled or disabled.</field>
					/// <field name="isVisible" type="Boolean">Gets or sets whether the view is visible.</field>
					/// <field name="items" type="Array">An array of <see cref="MobileCRM.UI._DetailItem">MobileCRM.UI._DetailItem</see> objects</field>
					/// <field name="name" type="String">Gets the name of the view</field>
					MobileCRM.UI._DetailView.superproto.constructor.apply(this, arguments);
				}
			}
		};

		/************************/
		// Prototypes & Statics //
		/************************/

		// MobileCRM.Bridge
		MobileCRM.Bridge.prototype._createCmdObject = function (success, failed, scope) {
			var self = MobileCRM.bridge;
			var cmdId = 'Cmd' + self.callbackId++;
			self.callbacks[cmdId] = { SuccessFn: success, FailedFn: failed, Scope: scope };
			return cmdId;
		};

		MobileCRM.Bridge.prototype.requestObject = function (objectName, callback, errorCallback, scope) {
			/// <summary>Requests the C# object.</summary>
			/// <remarks>Method initiates an asynchronous request which either ends with calling the <b>errorCallback</b> or with calling the <b>callback</b> with JSON representation of requested C# object. Requested C# object must be exposed in C# using IJavascriptBridge.ExposeObject method.</remarks>
			/// <param name="objectName" type="String">The name of exposed managed object as it was registered on C# side (IJavascriptBridge.ExposeObject).</param>
			/// <param name="callback" type="function(obj)">The callback function that is called asynchronously with JSON-serialized <see cref="MobileCRM.ObservableObject">MobileCRM.ObservableObject</see> <b>obj</b> as argument. Callback must return the object clone with changed properties (see <see cref="MobileCRM.ObservableObject.getChanged">getChanged</see> method). Returned object is passed back to C# and its properties are applied back on requested object.</param>
			/// <param name="errorCallback" type="function(errorMsg)">The errorCallback which is called asynchronously in case of error.</param>
			/// <param name="scope" type="Object">The scope for callbacks.</param>
			MobileCRM.bridge.command("requestObj", objectName, callback, errorCallback, scope);
		}
		MobileCRM.Bridge.prototype.initialize = function () {
			/// <summary>Initializes the bridge to be used for synchronous invokes.</summary>
		}
		MobileCRM.Bridge.prototype.invokeMethod = function (objectName, method) {
			/// <summary>Synchronously invokes a method on exposed managed object and returns the result.</summary>
			/// <remarks><p>WARNING: This function is in experimental stage and can cause a deadlock if invoked C# method calls back to Javascript. Its usage must be tested on all platforms.</p><p>Before calling this method for the first time, it is necessary to initialize the bridge by calling <see cref="MobileCRM.Bridge.initialize">initialize</see> method.</p></remarks>
			/// <param name="objectName" type="String">The name of exposed managed object as it was registered on C# side (IJavascriptBridge.ExposeObject).</param>
			/// <param name="method" type="String">The name of the method implemented by object class.</param>
			var params = [];
			var i = 2;
			while (arguments[i])
				params.push(arguments[i++]);
			return MobileCRM.bridge.invoke("invokeMethod", objectName + "." + method + JSON.stringify(params));
		}
		MobileCRM.Bridge.prototype.invokeStaticMethod = function (assembly, typeName, method) {
			/// <summary>Synchronously invokes a static method on specified type and returns the result.</summary>
			/// <remarks><p>WARNING: This function is in experimental stage and can cause a deadlock if invoked C# method calls back to Javascript. Its usage must be tested on all platforms.</p><p>Before calling this method for the first time, it is necessary to initialize the bridge by calling <see cref="MobileCRM.Bridge.initialize">initialize</see> method.</p></remarks>
			/// <param name="assembly" type="String">The name of the assembly which defines the type.</param>
			/// <param name="typeName" type="String">The full name of the C# type which implements the method.</param>
			/// <param name="method" type="String">The name of static method to be invoked.</param>
			var params = [];
			var i = 3;
			while (arguments[i])
				params.push(arguments[i++]);
			return MobileCRM.bridge.invoke("invokeMethod", (assembly ? (assembly + ":") : "") + typeName + "." + method + JSON.stringify(params));
		}
		MobileCRM.Bridge.prototype.getPropertyValue = function (objectName, property) {
			/// <summary>Synchronously invokes a property getter on exposed managed object and returns the result.</summary>
			/// <param name="objectName" type="String">The name of exposed managed object as it was registered on C# side (IJavascriptBridge.ExposeObject).</param>
			/// <param name="property" type="String">The name of the property.</param>
			return MobileCRM.bridge.invokeMethod(objectName, "get_" + property);
		}
		MobileCRM.Bridge.prototype.setPropertyValue = function (objectName, property, value) {
			/// <summary>Synchronously invokes a property setter on exposed managed object.</summary>
			/// <param name="objectName" type="String">The name of exposed managed object as it was registered on C# side (IJavascriptBridge.ExposeObject).</param>
			/// <param name="property" type="String">The name of the property.</param>
			/// <param name="value" type="">A value being set into property.</param>
			return MobileCRM.bridge.invokeMethod(objectName, "set_" + property, value);
		}
		MobileCRM.Bridge.prototype.runCallback = function (id, response) {
			/// <summary>Internal method which is called from Mobile CRM application to run a command callback.</summary>
			/// <param name="id" type="String">A command ID</param>
			/// <param name="response" type="String">A string containing the JSON response</param>
			try {
				var callback = MobileCRM.bridge.callbacks[id];
				if (callback) {
					var result = null;
					if (callback.SuccessFn) {
						result = callback.SuccessFn.call(callback.Scope, response);
						// Forget SuccessFn not to be called anymore
						delete callback.SuccessFn;
					}
					return JSON.stringify(result);
				}
				return "Err: callback not found";
			} catch (exception) {
				return 'Err:' + exception.message;
			}
		};
		MobileCRM.Bridge.prototype.setResponse = function (id, response, deleteCallback) {
			/// <summary>Internal method which is called from Mobile CRM application in case of successfully processed command.</summary>
			/// <param name="id" type="String">A command ID</param>
			/// <param name="response" type="String">A string containing the JSON response</param>
			try {
				var self = MobileCRM.bridge;
				var callback = self.callbacks[id];
				if (callback) {
					if (callback.SuccessFn) {
						callback.SuccessFn.call(callback.Scope, response);
					}
					if (deleteCallback != false)
						delete self.callbacks[id];
				}
			} catch (exception) {
				return exception.message;
			}
			return "OK";
		};
		MobileCRM.Bridge.prototype.setError = function (id, error) {
			/// <summary>Internal method which is called from Mobile CRM application in case of command processing failure.</summary>
			/// <param name="id" type="String">A command ID</param>
			/// <param name="response" type="String">A string containing the error message</param>
			var self = MobileCRM.bridge;
			var callback = self.callbacks[id];
			if (callback) {
				if (callback.FailedFn) {
					callback.FailedFn.call(callback.Scope, error);
				}
				delete self.callbacks[id];
			}
		};
		MobileCRM.Bridge.prototype.closeForm = function () {
			/// <summary>Closes a form containing this HTML document.</summary>
			MobileCRM.bridge.command("closeForm");
		};

		// MobileCRM.ObservableObject 
		MobileCRM.ObservableObject = function (props) {
			/// <summary>Represents a generic object which is monitoring the changes of its properties.</summary>
			/// <param name="props" type="Object">Optional list of properties.</param>
			var privChanged = {};

			var propertyChanged = new _Event(this);
			propertyChanged.add(function (args) {
				privChanged[args] = true;
			}, this);
			Object.defineProperty(this, "propertyChanged", { value: propertyChanged, enumerable: false });
			Object.defineProperty(this, "_privChanged", { value: privChanged, enumerable: false });

			if (props) {
				for (var i in props) {
					this.addProp(i, true, props[i]);
				}
			}
		};
		MobileCRM.ObservableObject.prototype.addProp = function (name, writable, value) {
			/// <summary>Creates a new observable property for this object</summary>
			/// <param name="name" type="String">A name of the new property.</param>
			/// <param name="writable" type="Boolean">Indicates whether the property should have setter.</param>
			/// <param name="value" type="">An initial value.</param>
			_addProperty(this, name, writable, value);
		};
		MobileCRM.ObservableObject.prototype.getChanged = function () {
			/// <summary>Creates a clone of this object containing all properties that were changed since object construction.</summary>
			/// <remarks>This method enumerates object recursively and creates the object clone containing only the changed properties.</remarks>
			/// <returns type="Object">An object clone containing all changed properties.</returns>
			var parse = function (obj, changedProps) {
				var result = null;
				for (var i in obj) {
					var val = obj[i];
					var changedVal = undefined;
					if (val instanceof MobileCRM.ObservableObject)
						changedVal = val.getChanged();
					else if (val && typeof val == "object" && !(val instanceof Date) && i[0] != '_')
						changedVal = parse(val, {});
					else if (changedProps[i] == true)
						changedVal = val;
					if (changedVal != undefined) {
						if (result == null) {
							if (obj.constructor == Array) {
								result = [];
								for (var j = 0; j < obj.length; j++)
									result[j] = null;
							}
							else
								result = {};
						}
						result[i] = changedVal;
					}
				}
				return result;
			};
			return parse(this, this._privChanged);
		}

		//MobileCRM.Configuration
		MobileCRM.Configuration.requestObject = function (callback, errorCallback, scope) {
			/// <summary>Requests the managed Configuration object.</summary>
			/// <remarks>Method initiates an asynchronous request which either ends with calling the <b>errorCallback</b> or with calling the <b>callback</b> with Javascript version of Configuration object. See <see cref="MobileCRM.Bridge.requestObject">MobileCRM.Bridge.requestObject</see> for further details.</remarks>
			/// <param name="callback" type="function(config)">The callback function that is called asynchronously with <see cref="MobileCRM.Configuration">MobileCRM.Configuration</see> object instance as argument. Callback should return true to apply changed properties.</param>
			/// <param name="errorCallback" type="function(errorMsg)">The errorCallback which is called in case of error.</param>
			/// <param name="scope" type="Object">The scope for callbacks.</param>
			MobileCRM.bridge.requestObject("Configuration", function (obj) {
				if (callback.call(scope, obj) != false) {
					var changed = obj.getChanged();
					return changed;
				}
				return '';
			}, errorCallback, scope);
		};

		//MobileCRM.Localization
		MobileCRM.Localization.initialize = function (callback, errorCallback, scope) {
			/// <summary>Initializes the Localization object.</summary>
			/// <remarks><p>Method loads the string table asynchronously and calls either the <b>errorCallback</b> with error message or the <b>callback</b> with initialized Localization object.</p><p>All other functions will return the default or empty string before the initialization finishes.</p></remarks>
			/// <param name="callback" type="function(config)">The callback function that is called asynchronously with initialized Localization object as argument.</param>
			/// <param name="errorCallback" type="function(errorMsg)">The errorCallback which is to be called in case of error.</param>
			/// <param name="scope" type="Object">The scope for callbacks.</param>
			MobileCRM.bridge.command("localizationInit", null, function (res) {
				MobileCRM.Localization.stringTable = res;
				if (callback)
					callback.call(scope, MobileCRM.Localization);
			}, errorCallback, scope);
		};
		MobileCRM.Localization.getTextOrDefault = function (id, defaultString) {
			/// <summary>Gets the display string for the passed id, or the passed default string if a string with the passed id doesn't exists.</summary>
			/// <param name="id" type="String">Display string id.</param>
			/// <param name="defaultString" type="String">Default display string.</param>
			/// <returns type="String">Human readable string label.</returns>
			return MobileCRM.Localization.stringTable[id] || defaultString;
		};
		MobileCRM.Localization.getComponentLabel = function (entityName, componentType, viewName) {
			/// <summary>Gets the display string for the passed entity and component (view, form) id.</summary>
			/// <param name="entityName" type="String">The entity logical name.</param>
			/// <param name="componentType" type="String">The component type. (View, DetailView).</param>
			/// <param name="viewName" type="String">The component id</param>
			/// <returns type="String">The component label.</returns>
			return MobileCRM.Localization.stringTable[entityName + "." + componentType + "." + viewName] || MobileCRM.Localization.stringTable[componentType + "." + viewName] || viewName;
		}
		MobileCRM.Localization.get = function (id) {
			/// <summary>Gets the display string for the passed id.</summary>
			/// <param name="id" type="String">Display string id.</param>
			/// <returns type="String">Human readable string label.</returns>
			return MobileCRM.Localization.getTextOrDefault(id, id);
		}
		MobileCRM.Localization.getPlural = function (id) {
			/// <summary>Gets the plural version of the display string for the passed id.</summary>
			/// <param name="id" type="String">Display string id.</param>
			/// <returns type="String">Human readable plural string label.</returns>
			return MobileCRM.Localization.get(id + "+s");
		}
		MobileCRM.Localization.makeId = function (section, id) {
			/// <summary>Creates an absolute id from section and id.</summary>
			/// <param name="section" type="String">The section id.</param>
			/// <param name="id" type="String">Display string id.</param>
			/// <returns type="String">Absolute id.</returns>
			return section + "." + id;
		}

		//MobileCRM.Reference
		MobileCRM.Reference.prototype.toString = function () {
			/// <summary>Prints the reference primary name into string.</summary>
			/// <returns type="String">A string with primary name of this entity reference.</returns>
			return this.primaryName;
		}
		MobileCRM.Reference.loadById = function (entityName, id, success, failed, scope) {
			/// <summary>Asynchronously loads the CRM reference.</summary>
			/// <param name="entityName" type="String">An entity name</param>
			/// <param name="id" type="String">The reference ID.</param>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> will carry an instance of <see cref="MobileCRM.Reference">MobileCRM.Reference</see> object.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			window.MobileCRM.bridge.command('referenceload', JSON.stringify({ entity: entityName, id: id }), success, failed, scope);
		};

		// MobileCRM.DynamicEntity
		_inherit(MobileCRM.DynamicEntity, MobileCRM.Reference);
		MobileCRM.DynamicEntity.createNew = function (entityName, id, primaryName, properties) {
			/// <summary>Creates the MobileCRM.DynamicEntity object representing new entity.</summary>
			/// <param name="entityName" type="String">The logical name of the entity, e.g. "account".</param>
			/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
			/// <param name="primaryName" type="String">The human readable name of the entity, e.g "Alexandro".</param>
			/// <param name="properties" type="Object">An object with entity properties, e.g. {firstname:"Alexandro", lastname:"Puccini"}.</param>
			var entity = new MobileCRM.DynamicEntity(entityName, id, primaryName, properties);
			entity.isNew = true;
			return entity;
		}
		MobileCRM.DynamicEntity.deleteById = function (entityName, id, success, failed, scope) {
			/// <summary>Asynchronously deletes the CRM entity.</summary>
			/// <param name="entityName" type="String">The logical name of the entity, e.g. "account".</param>
			/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
			/// <param name="success" type="function()">A callback function for successful asynchronous result.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			var request = { entity: entityName, id: id };
			var cmdParams = JSON.stringify(request);
			window.MobileCRM.bridge.command('entitydelete', cmdParams, success, failed, scope);
		};
		MobileCRM.DynamicEntity.loadById = function (entityName, id, success, failed, scope) {
			/// <summary>Asynchronously loads the CRM entity properties.</summary>
			/// <param name="entityName" type="String">The logical name of the entity, e.g. "account".</param>
			/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> argument will carry the MobileCRM.DynamicEntity object.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			window.MobileCRM.bridge.command('entityload', JSON.stringify({ entity: entityName, id: id }), success, failed, scope);
		};
		MobileCRM.DynamicEntity.loadDocumentBody = function (entityName, id, success, failed, scope) {
			/// <summary>Asynchronously loads the document body for specified entity.</summary>
			/// <remarks>Function sends an asynchronous request to C#, where the locally stored document body (e.g. the annotation.documentbody) is encoded to base64 and sent back to the Javascript callback. This function returns only data stored either in local database or in local BLOB store. It does not support online data.</remarks>
			/// <param name="entityName" type="String">The logical name of the entity, in most cases "annotation".</param>
			/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> argument will carry the string with base64-encoded data.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			window.MobileCRM.bridge.command('documentBodyload', JSON.stringify({ entity: entityName, id: id }), success, failed, scope);
		};
		MobileCRM.DynamicEntity.prototype.save = function (callback) {
			/// <summary>Performs the asynchronous CRM create/modify entity command.</summary>
			/// <param name="callback" type="function(err)">A callback function for asynchronous result. The <b>err</b> argument will carry the error message or null in case of success. The callback is called in scope of DynamicEntity object which is being saved.</param>
			var props = this.properties;
			if (props._privVals)
				props = props._privVals;
			var request = { entity: this.entityName, id: this.id, properties: props, isNew: this.isNew, isOnline: this.isOnline };
			var cmdParams = JSON.stringify(request);
			var self = this;
			window.MobileCRM.bridge.command('entitysave', cmdParams,
						function (res) {
							self.id = res.id;
							self.isNew = false;
							self.isOnline = res.isOnline;
							self.properties = res.properties;
							callback.call(self, null);
						},
						function (err) {
							callback.call(self, err);
						}, null);
			return this;
		};

		// MobileCRM.Metadata
		MobileCRM.Metadata.requestObject = function (callback, errorCallback, scope) {
			/// <summary>Requests the managed Metadata object.</summary>
			/// <remarks>Method initiates an asynchronous request which either ends with calling the <b>errorCallback</b> or with calling the <b>callback</b> with Javascript version of Metadata object. See <see cref="MobileCRM.Bridge.requestObject">MobileCRM.Bridge.requestObject</see> for further details.</remarks>
			/// <param name="callback" type="function(metadata)">The callback function that has to be called asynchronously with serialized EntityForm object as argument. Callback should return true to apply changed properties.</param>
			/// <param name="errorCallback" type="function(errorMsg)">The errorCallback which has to be called in case of error.</param>
			/// <param name="scope" type="Object">The scope for callbacks.</param>
			MobileCRM.bridge.requestObject("Metadata", function (obj) {
				if (obj) {
					MobileCRM.Metadata.entities = obj;
				}
				callback.call(scope, MobileCRM.Metadata);
				return '';
			}, errorCallback, scope);
		}

		MobileCRM.Metadata.getEntity = function (name) {
			/// <summary>Gets the MetaEntity by its name.</summary>
			/// <param name="name" type="String">A name of MetaEntity.</param>
			/// <returns type="MobileCRM.MetaEntity">A <see cref="MobileCRM.MetaEntity">MobileCRM.MetaEntity</see> object or "undefined".</returns>
			return MobileCRM.Metadata.entities[name];
		};

		MobileCRM.Metadata.getActivities = function () {
			/// <summary>Gets the list of activities.</summary>
			/// <returns type="Array">An array of entity names.</returns>
			var arr = [];
			for (var entity in obj) {
				var meta = obj[entity];
				if (meta.isEnabled && meta.canRead() && (meta.attributes & 0x0010) != 0)
					arr.push(meta.name);
			}
		};

		MobileCRM.Metadata._childParentMap = { invoicedetail: "invoice", quotedetail: "quote", salesorderdetail: "salesorder", opportunityproduct: "opportunity", uom: "uomschedule", productpricelevel: "pricelevel", discount: "discounttype", contractdetail: "contract", salesliteratureitem: "salesliterature", queueitem: "queue", activitymimeattachment: "email" };
		MobileCRM.Metadata.getEntityParent = function (childEntityName) {
			/// <summary>Gets the entity&#39;s parent entity name.</summary>
			/// <param name="childEntityName" type="String">The entity name.</param>
			/// <returns type="String">The parent entity name, or "undefined" if N/A.</returns>
			return MobileCRM.Metadata._childParentMap[childEntityName];
		};

		MobileCRM.Metadata.entityHasChildren = function (entityName) {
			/// <summary>Gets whether the passed entity has child entities.</summary>
			/// <param name="entityName" type="String">The entity name.</param>
			/// <returns type="Boolean">True if the entity is a parent, false otherwise.</returns>
			return "undefined" != typeof MobileCRM.Metadata._childParentMap[entityName];
		};

		// MobileCRM.MetaEntity
		_inherit(MobileCRM.MetaEntity, MobileCRM.ObservableObject);

		MobileCRM.MetaEntity.prototype.getProperty = function (name) {
			/// <summary>Gets the MetaProperty by its name.</summary>
			/// <param name="name" type="String">A name of MetaProperty.</param>
			/// <returns type="MobileCRM.MetaProperty">A <see cref="MobileCRM.MetaProperty">MobileCRM.MetaProperty</see> object or "undefined".</returns>
			var properties = this.properties;
			if (properties) {
				for (var i = 0; i < properties.length; i++) {
					if (properties[i].name == name)
						return properties[i];
				}
			}
			return null;
		};
		MobileCRM.MetaEntity.prototype.canRead = function () {
			/// <summary>Checks whether the current user has read permission on the entity type.</summary>
			/// <returns type="Boolean">True if the permission is granted, false otherwise.</returns>
			return this.getDepth(0) != 0;
		}
		MobileCRM.MetaEntity.prototype.canWrite = function () {
			/// <summary>Checks whether the current user has write permission on the entity type.</summary>
			/// <returns type="Boolean">True if the permission is granted, false otherwise.</returns>
			return this.getDepth(1) != 0;
		}
		MobileCRM.MetaEntity.prototype.canCreate = function () {
			/// <summary>Checks whether the current user has create permission on the entity type.</summary>
			/// <returns type="Boolean">True if the permission is granted, false otherwise.</returns>
			return this.getDepth(2) != 0;
		}
		MobileCRM.MetaEntity.prototype.canAppendTo = function (child) {
			/// <summary>Checks whether the user has permission to append a child <b>To</b> a this parent entity.</summary>
			/// <param name="child" type="String">The entity to append (f.e. opportunity).</param>
			/// <returns type="Boolean">True if the user has append permissions, false otherwise.</returns>
			return this.getDepth(5) != 0 && MobileCRM.Metadata.entities[child].getDepth(4) != 0;
		}
		MobileCRM.MetaEntity.prototype.canDelete = function () {
			/// <summary>Checks whether the current user has create permission on the entity type.</summary>
			/// <returns type="Boolean">True if the permission is granted, false otherwise.</returns>
			return this.getDepth(3) != 0;
		}
		MobileCRM.MetaEntity.prototype.getDepth = function (permission) {
			/// <summary>Gets the permission depth.</summary>
			/// <param name="permission" type="Number">Permission to check.</param>
			/// <returns type="Number">The permission depth (none, user, business unit, organization).</returns>
			var p = this.permissionMask;
			var m = permission * 4;
			var d = (p >> m) & 0xF;

			var disabled = (this.attributes & (0x40 << permission)) != 0;
			if (disabled)
				d = 0;

			return d;
		}

		// MobileCRM.FetchXml.Fetch
		MobileCRM.FetchXml.Fetch.executeFromXML = function (fetchXmlData, success, failed, scope) {
			/// <summary>Performs the asynchronous CRM Fetch command.</summary>
			/// <remarks></remarks>
			/// <param name="fetchXmlData" type="String">CRM fetch in XML representation.</param>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> argument will carry the objects array of type specified by <b>resultformat</b> XML attribute (Array, JSON, XML or DynamicEntities).</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			window.MobileCRM.bridge.command('fetchXML', fetchXmlData, success, failed, scope);
		};
		MobileCRM.FetchXml.Fetch.prototype.execute = function (output, success, failed, scope) {
			/// <summary>Performs the asynchronous CRM Fetch command.</summary>
			/// <param name="output" type="String">A string defining the output format: Array, JSON, XML or DynamicEntities.</param>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> argument will carry the objects array of type specified by <b>output</b> argument.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			var reqParams = JSON.stringifyNotNull({ entity: this.entity, resultformat: output, page: this.page, count: this.count, aggregate: this.aggregate });
			MobileCRM.bridge.command('fetch', reqParams, success, failed, scope);
		};

		// MobileCRM.FetchXml.Entity
		MobileCRM.FetchXml.Entity.prototype.addAttribute = function (name) {
			/// <summary>Adds an entity attribute to the fetch query.</summary>
			/// <param name="attribute" type="String">The attribute (CRM logical field name) to order by.</param>
			/// <returns type="MobileCRM.FetchXml.Attribute">The newly created MobileCRM.FetchXml.Attribute object</returns>
			var attr = new MobileCRM.FetchXml.Attribute(name);
			this.attributes.push(attr);
			return attr;
		};
		MobileCRM.FetchXml.Entity.prototype.addAttributes = function () {
			/// <summary>Adds all entity attributes to the fetch query.</summary>
			this.allattributes = true;
		};
		MobileCRM.FetchXml.Entity.prototype.addLink = function (target, from, to, linktype) {
			/// <summary>Adds an entity link (join) to the fetch query.</summary>
			/// <param name="target" type="String">The target entity.</param>
			/// <param name="from" type="String">The "from" field (if parent then target entity primary key).</param>
			/// <param name="to" type="String">The "to" field.</param>
			/// <param name="linkType" type="String">The link (join) type ("inner" or "outer").</param>
			/// <returns type="MobileCRM.FetchXml.LinkEntity">The newly created MobileCRM.FetchXml.LinkEntity object.</returns>
			var link = new MobileCRM.FetchXml.LinkEntity(target);
			link.from = from;
			link.to = to;
			link.linktype = linktype;
			this.linkentities.push(link);
			return link;
		};
		MobileCRM.FetchXml.Entity.prototype.orderBy = function (attribute, descending) {
			/// <summary>Adds an order by statement to the fetch query.</summary>
			/// <param name="attribute" type="String">The attribute (CRM logical field name) to order by.</param>
			/// <param name="descending" type="Boolean">false, for ascending order; true, for descending order.</param>
			/// <returns type="MobileCRM.FetchXml.Order">The newly created MobileCRM.FetchXml.Order object.</returns>
			var order = new MobileCRM.FetchXml.Order(attribute, descending);
			this.order.push(order);
			return order;
		}

		// MobileCRM.FetchXml.LinkEntity
		_inherit(MobileCRM.FetchXml.LinkEntity, MobileCRM.FetchXml.Entity);

		// MobileCRM.FetchXml.Filter
		MobileCRM.FetchXml.Filter.prototype.where = function (attribute, op, value) {
			/// <summary>Adds a attribute condition to the filter.</summary>
			/// <param name="attribute" type="String">The attribute name (CRM logical field name).</param>
			/// <param name="op" type="String">The condition operator. "eq", "ne", "lt", "le", "gt", "ge", "like"</param>
			/// <param name="value" type="Depends on attribute type">The values to compare to.</param>
			/// <returns type="MobileCRM.FetchXml.Condition">The condition instance.</returns>
			var condition = new MobileCRM.FetchXml.Condition();
			condition.attribute = attribute;
			condition.operator = op;
			condition.value = value;
			this.conditions.push(condition);
			return condition;
		};
		MobileCRM.FetchXml.Filter.prototype.isIn = function (attribute, values) {
			/// <summary>Adds a attribute inclusion condition to the filter.</summary>
			/// <param name="attribute" type="String">The attribute name (CRM logical field name).</param>
			/// <param name="values" type="Array">An array of values.</param>
			/// <returns type="MobileCRM.FetchXml.Condition">The condition instance.</returns>
			var condition = new MobileCRM.FetchXml.Condition();
			condition.attribute = attribute;
			condition.operator = "in";
			condition.values = values;
			this.conditions.push(condition);
			return condition;
		};
		MobileCRM.FetchXml.Filter.prototype.between = function (attribute, low, high) {
			/// <summary>Adds a condition that the passed attribute is between the passed bounds.</summary>
			/// <param name="attribute" type="String">The attribute name (CRM logical field name).</param>
			/// <param name="low" type="Depends on attribute type">The lower bound.</param>
			/// <param name="high" type="Depends on attribute type">The higher bound.</param>
			/// <returns type="MobileCRM.FetchXml.Condition">The condition instance.</returns>
			var condition = new MobileCRM.FetchXml.Condition();
			condition.attribute = attribute;
			condition.operator = "between";
			condition.values = [low, high];
			this.conditions.push(condition);
			return condition;
		};
		MobileCRM.FetchXml.Filter.prototype.startsWith = function (attribute, value) {
			/// <summary>Adds a condition that the passed column value contains the passed string.</summary>
			/// <param name="attribute" type="String">The attribute name (CRM logical field name).</param>
			/// <param name="value" type="String">The value to compare to.</param>
			/// <returns type="MobileCRM.FetchXml.Condition">The condition instance.</returns>
			return this.where(attribute, "like", value + "%");
		};
		MobileCRM.FetchXml.Filter.prototype.contains = function (attribute, value) {
			/// <summary>Adds a condition that the passed column starts with the passed string.</summary>
			/// <param name="attribute" type="String">The attribute name (CRM logical field name).</param>
			/// <param name="value" type="String">The value to compare to.</param>
			/// <returns type="MobileCRM.FetchXml.Condition">The condition instance.</returns>
			return this.where(attribute, "like", "%" + value + "%");
		};

		// MobileCRM.Platform
		_inherit(MobileCRM.Platform, MobileCRM.ObservableObject);

		MobileCRM.Platform.requestObject = function (callback, errorCallback, scope) {
			/// <summary>Requests the managed Platform object.</summary>
			/// <remarks>Method initiates an asynchronous request which either ends with calling the <b>errorCallback</b> or with calling the <b>callback</b> with Javascript version of Platform object. See <see cref="MobileCRM.Bridge.requestObject">MobileCRM.Bridge.requestObject</see> for further details.</remarks>
			/// <param name="callback" type="function(platform)">The callback function that has to be called asynchronously with serialized Platform object as argument.</param>
			/// <param name="errorCallback" type="function(errorMsg)">The errorCallback which has to be called in case of error.</param>
			/// <param name="scope" type="Object">The scope for callbacks.</param>
			MobileCRM.bridge.requestObject("Platform", callback, errorCallback, scope);
		};
		MobileCRM.Platform.getURL = function (success, failed, scope) {
			/// <summary>Gets the full URL of currently loaded HTML document.</summary>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> will carry a string with URL.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			MobileCRM.bridge.command("getURL", null, success, failed, scope);
		};
		MobileCRM.Platform.getDeviceInfo = function (success, failed, scope) {
			/// <summary>Gets the device information.</summary>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> will carry a <see cref="MobileCRM._DeviceInfo">MobileCRM._DeviceInfo</see> object.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			MobileCRM.bridge.command("getDeviceInfo", null, success, failed, scope);
		};
		MobileCRM.Platform.scanBarCode = function (success, failed, scope) {
			/// <summary>Activates the bar-code scanning.</summary>
			/// <remarks>If the current platform does not support the bar-code scanning, the <b>failed</b> handler is called with error "Unsupported".</remarks>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> will carry an array of strings with scanned codes.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			MobileCRM.bridge.command("scanBarcode", null, success, failed, scope);
		};
		MobileCRM.Platform.getLocation = function (success, failed, scope) {
			/// <summary>Gets current geo-location from platform-specific location service.</summary>
			/// <remarks>If the current platform does not support the location service, the <b>failed</b> handler is called with error "Unsupported".</remarks>
			/// <param name="success" type="function(result)">A callback function for successful asynchronous result. The <b>result</b> will carry an object with properties <b>latitude</b> and <b>longitude</b>.</param>
			/// <param name="failed" type="function(error)">A callback function for command failure. The <b>error</b> argument will carry the error message.</param>
			/// <param name="scope" type="">A scope for calling the callbacks; set &quot;null&quot; to call the callbacks in global scope.</param>
			MobileCRM.bridge.command("getLocation", null, success, failed, scope);
		};

		MobileCRM.UI.FormManager.showEditDialog = function (entityName, id) {
			/// <summary>Shows an entity edit dialog.</summary>
			/// <param name="entityName" type="String">The entity name.</param>
			/// <param name="id" type="String">GUID of the existing entity or null for new one.</param>
			var reference = new MobileCRM.Reference(entityName, id);
			if (!id || id.length == 0)
				delete reference.id;
			MobileCRM.bridge.command("formManagerAction", JSON.stringify(reference));
		}
		MobileCRM.UI.FormManager.showDetailDialog = function (entityName, id) {
			/// <summary>Shows an entity detail dialog.</summary>
			/// <param name="entityName" type="String">The entity name.</param>
			/// <param name="id" type="String">GUID of the existing entity.</param>
			var reference = new MobileCRM.Reference(entityName, id);
			reference.detail = true;
			MobileCRM.bridge.command("formManagerAction", JSON.stringify(reference));
		}
		MobileCRM.UI.FormManager.showNewDialog = function (entityName) {
			/// <summary>Shows a new entity dialog.</summary>
			/// <param name="entityName" type="String">The entity name.</param>
			MobileCRM.UI.FormManager.showEditDialog(entityName, null);
		}

		_inherit(MobileCRM.UI._DetailView, MobileCRM.ObservableObject);
		MobileCRM.UI._DetailView.prototype.getItemByName = function (name) {
			/// <summary>Returns the <see cref="MobileCRM.UI._DetailItem">MobileCRM.UI._DetailItem</see> with specified name or "null".</summary>
			/// <param name="name" type="String">A name of requested detail item.</param>
			/// <returns type="MobileCRM.UI._DetailItem">An instance of <see cref="MobileCRM.UI._DetailItem">MobileCRM.UI._DetailItem</see> with specified name or "null".</returns>
			var items = this.items;
			var nItems = items.length;
			for (var i = 0; i < nItems; i++) {
				var item = items[i];
				if (item.name == name)
					return item;
			}
			return undefined;
		};

		// MobileCRM.UI.ViewController
		MobileCRM.UI.ViewController.createCommand = function (primary, labels, callback, scope) {
			/// <summary>Overrides the form's primary/secondary command button.</summary>
			/// <param name="primary" type="Boolean">true, for primary button; false, for secondary button.</param>
			/// <param name="labels" type="Array/String">An array of labels or single label.</param>
			/// <param name="callback" type="Function">A callback which has to be called when command is launched.</param>
			/// <param name="scope" type="Object">A scope, in which the callback has to be called.</param>
			var cmdId = MobileCRM.bridge._createCmdObject(callback, null, scope);
			if (typeof labels == "string")
				labels = [labels];
			MobileCRM.bridge.command("createCommand", JSON.stringify({ commandId: cmdId, primary: primary, labels: labels }));
		};

		// MobileCRM.UI.EntityForm
		_inherit(MobileCRM.UI.EntityForm, MobileCRM.ObservableObject);
		MobileCRM.UI.EntityForm._handlers = { onChange: [], onSave: [] };

		MobileCRM.UI.EntityForm.prototype.getDetailView = function (name) {
			/// <summary>Returns the DetailView by its name.</summary>
			/// <param name="name" type="String">A name of DetailView.</param>
			/// <returns type="MobileCRM.UI._DetailView">A <see cref="MobileCRM.UI._DetailView">MobileCRM.UI._DetailView</see> object with requested name.</returns>
			var detailViews = this.detailViews;
			if (detailViews) {
				var nItems = detailViews.length;
				for (var i = 0; i < nItems; i++) {
					var item = detailViews[i];
					if (item.name == name)
						return item;
				}
			}
			return undefined;
		};

		MobileCRM.UI.EntityForm.onSave = function (handler, bind, scope) {
			/// <summary>Binds or unbinds the handler for onSave event on EntityForm.</summary>
			/// <param name="handler" type="function(entityForm)">The handler function that has to be bound or unbound.</param>
			/// <param name="bind" type="Boolean">Determines whether to bind or unbind the handler.</param>
			/// <param name="scope" type="Object">The scope for handler calls.</param>
			var handlers = MobileCRM.UI.EntityForm._handlers.onSave;
			var register = handlers.length == 0;
			_bindHandler(handler, handlers, bind, scope);
			if (register)
				MobileCRM.bridge.command("registerEvents", "onSave");
		}
		MobileCRM.UI.EntityForm.onChange = function (handler, bind, scope) {
			/// <summary>Binds or unbinds the handler for onChange event on EntityForm.</summary>
			/// <param name="handler" type="function(entityForm)">The handler function that has to be bound or unbound.</param>
			/// <param name="bind" type="Boolean">Determines whether to bind or unbind the handler.</param>
			/// <param name="scope" type="Object">The scope for handler calls.</param>
			var handlers = MobileCRM.UI.EntityForm._handlers.onChange;
			var register = handlers.length == 0;
			_bindHandler(handler, handlers, bind, scope);
			if (register)
				MobileCRM.bridge.command("registerEvents", "onChange");
		}
		MobileCRM.UI.EntityForm.requestObject = function (callback, errorCallback, scope) {
			/// <summary>Requests the managed EntityForm object.</summary>
			/// <remarks>Method initiates an asynchronous request which either ends with calling the <b>errorCallback</b> or with calling the <b>callback</b> with Javascript version of EntityForm object. See <see cref="MobileCRM.Bridge.requestObject">MobileCRM.Bridge.requestObject</see> for further details.</remarks>
			/// <param name="callback" type="function(entityForm)">The callback function that has to be called asynchronously with serialized EntityForm object as argument. Callback should return true to apply changed properties.</param>
			/// <param name="errorCallback" type="function(errorMsg)">The errorCallback which has to be called in case of error.</param>
			/// <param name="scope" type="Object">The scope for callbacks.</param>
			MobileCRM.bridge.requestObject("EntityForm", function (obj) {
				if (callback.call(scope, obj) != false) {
					var changed = obj.getChanged();
					return changed;
				}
				return '';
			}, errorCallback, scope);
		}
		MobileCRM.UI.EntityForm._callHandlers = function (event, data, context) {
			var handlers = MobileCRM.UI.EntityForm._handlers[event];
			if (handlers && handlers.length > 0) {
				data.context = context;
				if (_callHandlers(handlers, data) != false) {
					var changed = data.getChanged();
					return JSON.stringify(changed);
				}
				return '';
			}
		}
		MobileCRM.UI.EntityForm._callCmdHandlers = function (event, data) {
			var handlers = MobileCRM.UI.EntityForm._handlers[event];
			if (handlers && handlers.length > 0)
				return _callHandlers(handlers, data);
			return null;
		}
		MobileCRM.UI.EntityForm.onCommand = function (command, handler, bind, scope) {
			/// <summary>Binds or unbinds the handler for EntityForm command.</summary>
			/// <param name="command" type="String">The name of the EntityForm command.</param>
			/// <param name="handler" type="function(entityForm)">The handler function that has to be bound or unbound.</param>
			/// <param name="bind" type="Boolean">Determines whether to bind or unbind the handler.</param>
			/// <param name="scope" type="Object">The scope for handler calls.</param>
			var handlers = MobileCRM.UI.EntityForm._handlers[command];
			if (!handlers)
				handlers = MobileCRM.UI.EntityForm._handlers[command] = [];
			_bindHandler(handler, handlers, bind, scope);
			MobileCRM.bridge.command("registerEvents", "cmd:" + command);
		}
		MobileCRM.UI.EntityForm.onCanExecuteCommand = function (command, handler, bind, scope) {
			/// <summary>Binds or unbinds the handler called when the EntityForm needs to find out whether the command can be executed (is enabled).</summary>
			/// <param name="command" type="String">The name of the EntityForm command.</param>
			/// <param name="handler" type="function(entityForm)">The handler function that has to be bound or unbound. Handler&#39;s return value indicate whether the command is enabled (true/false).</param>
			/// <param name="bind" type="Boolean">Determines whether to bind or unbind the handler.</param>
			/// <param name="scope" type="Object">The scope for handler calls.</param>
			/// <remarks>Handlers used for this method cannot block the execution by UI tasks or call other bridge commands. Otherwise, the deadlock may occur on some platforms.</remarks>
			var handlerName = "CanExecute_" + command;
			var handlers = MobileCRM.UI.EntityForm._handlers[handlerName];
			if (!handlers)
				handlers = MobileCRM.UI.EntityForm._handlers[handlerName] = [];
			_bindHandler(handler, handlers, bind, scope);
			MobileCRM.bridge.command("registerEvents", "cmdEnabled:" + command);
		}


		/**************************************/
		// Platform dependent implementation   /
		// MobileCRM.bridge singleton creation /
		/**************************************/
		if (typeof CrmBridge !== "undefined") {
			// Android
			MobileCRM.Bridge.prototype.command = function (command, params, success, failed, scope) {
				var cmdId = this._createCmdObject(success, failed, scope);
				CrmBridge.println(cmdId + ';' + command + ':' + params);
			};
			if (typeof CrmBridge.invoke !== "undefined") {
				MobileCRM.Bridge.prototype.invoke = function (command, params) {
					var result = CrmBridge.invoke(command, params);
					if (result.length >= 4 && result.substr(0, 4) == 'ERR:')
						throw new MobileCrmException(result.substr(4));
					else
						return eval('(' + result + ')');
				};
			}
			MobileCRM.bridge = new MobileCRM.Bridge('Android');
		}
		else {
			if (typeof window.external !== "undefined" && window.external) {
				if (typeof window.external.notify !== "undefined") {
					// Windows Phone 7
					MobileCRM.Bridge.prototype.command = function (command, params, success, failed, scope) {
						var cmdId = this._createCmdObject(success, failed, scope);
						window.external.notify(cmdId + ';' + command + ':' + params);
					};
					MobileCRM.Bridge.prototype.invoke = function (command, params) {
						var result = undefined;
						var error = null;
						var cmdId = this._createCmdObject(function (res) { result = res; }, function (err) { error = err; }, this);
						window.external.notify(cmdId + ';' + command + ':' + params);
						if (error)
							throw new MobileCrmException(error);
						else
							return result;
					};
					MobileCRM.bridge = new MobileCRM.Bridge('WP7');
				}
				else if (typeof window.external.ProcessCommand !== "undefined") {
					// Windows Desktop
					MobileCRM.Bridge.prototype.command = function (command, params, success, failed, scope) {
						var cmdId = this._createCmdObject(success, failed, scope);
						window.external.ProcessCommand(cmdId, command, params);
					};
					if (typeof window.external.InvokeCommand !== "undefined") {
						MobileCRM.Bridge.prototype.invoke = function (command, params) {
							var result = window.external.InvokeCommand(command, params);
							if (result.length >= 4 && result.substr(0, 4) == 'ERR:')
								throw new MobileCrmException(result.substr(4));
							else
								return eval('(' + result + ')');
						};
					}
					MobileCRM.bridge = new MobileCRM.Bridge('Windows');
				}
			}
			else if (navigator.userAgent.toLowerCase().match(/(iphone|ipod|ipad)/)) {
				// iOS
				var lastError = null;
				var bridgeServerPort = null;
				var _sendHttpRequest = function (bridgeId, cmdId, port) {
					if (!port)
						port = bridgeServerPort || 13765;
					lastError = null;
					try {
						var sjax = new XMLHttpRequest();
						sjax.open("GET", "http://127.0.0.1:" + port, false);
						sjax.setRequestHeader("CRM-BridgeID", bridgeId);
						sjax.setRequestHeader("CRM-CommandID", cmdId);
						sjax.send();
						bridgeServerPort = port;
						if (sjax.responseText == 'OK')
							return true;
						lastError = "Unexpected response:" + sjax.responseText;
						return false;
					} catch (exc) {
						if (bridgeServerPort || port > 13780){
							lastError = exc.message;
							return false;
						}
						return _sendHttpRequest(bridgeId, cmdId, port + 1); // port discovery phase
					}
				};
				var _getHashCode = function(s) {
					var hash = 0, i, char;
					var l = s.length;
					if (l == 0) return hash;
					for (i = 0; i < l; i++) {
						char = s.charCodeAt(i);
						hash = ((hash << 5) - hash) + char;
						hash |= 0; // Convert to 32bit integer
					}
					return hash;
				};

				MobileCRM.Bridge.prototype.command = function (command, params, success, failed, scope) {
					var self = MobileCRM.bridge;
					var cmdId = self._createCmdObject(success, failed, scope);
					var cmdText = cmdId + ';' + command + ':' + params; //{ Command: command, Id: callbackObj };
					self.commandQueue.push(cmdText);
					if (!self.processing) {
						self.processing = true;
						document.location.href = 'crm:wake';
					}
				};
				MobileCRM.Bridge.prototype.peekCommand = function () {
					var cmdText = MobileCRM.bridge.commandQueue.shift();
					if (cmdText != null) {
						return cmdText;
					}
					return "";
				};
				MobileCRM.Bridge.prototype.invoke = function (command, params) {
					var self = MobileCRM.bridge;
					var result = undefined;
					var error = null;
					var cmdId = self._createCmdObject(function (res) { result = res; }, function (err) { error = err; }, self);
					var cmdText = cmdId + ';' + command + ':' + params;
					self.commandQueue.push(cmdText);
					if (!_sendHttpRequest(MobileCRM.bridge.id, cmdId))
						error = "JSBridge server unreachable (lastError=" + lastError + ").";

					if (error)
						throw new MobileCrmException(error);
					return result;
				};
				MobileCRM.Bridge.prototype.dequeueCommand = function (id) {
					var queue = MobileCRM.bridge.commandQueue;
					for (var i in queue) {
						var cmdText = queue[i];
						var idEnd = cmdText.indexOf(';');
						if (idEnd > 0 && cmdText.substr(0, idEnd) == id) {
							queue.splice(i, 1);
							return cmdText;
						}
					}
					return "";
				};
				MobileCRM.bridge = new MobileCRM.Bridge('iOS');

				MobileCRM.Bridge.prototype.initialize = function () {
					/// <summary>Initializes the bridge to be used for synchronous invokes.</summary>
					try { MobileCRM.bridge.invoke("initBridge", ""); } catch (exc) { };
				};

				// Generate random ID from URL hash and current time
				var id = ((_getHashCode(window.location.toString()) * 7919) + ((new Date()).getTime()));
				MobileCRM.bridge.id = id | 0; // Convert to 32bit integer
			}

			//if (MobileCRM.bridge == null)
			//    throw new Error("MobileCRM bridge does not support this platform.");
		}
	}

	///////////////////////////////////////////
	// Resolve the missing JSON implementation
	if (typeof JSON === "undefined")
		JSON = {};

	if (typeof JSON.parse !== 'function')
		JSON.parse = function (text, reviver) {
			var j;
			function walk(holder, key) {
				var k, v, value = holder[key];
				if (value && typeof value === 'object') {
					for (k in value) {
						if (Object.prototype.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}

			text = String(text);
			var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
			cx.lastIndex = 0;
			if (cx.test(text)) {
				text = text.replace(cx, function (a) {
					return '\\u' +
						('0000' + a.charCodeAt(0).toString(16)).slice(-4);
				});
			}
			if (/^[\],:{}\s]*$/
					.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
						.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
						.replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
				j = eval('(' + text + ')');
				return typeof reviver === 'function' ?
					walk({ '': j }, '') : j;
			}
			throw new SyntaxError('JSON.parse');
		};

	if (typeof JSON.stringify !== 'function')
		JSON.stringify = function (obj) {
			var t = typeof obj;
			if (t != "object" || obj === null) {
				if (t == "string") obj = obj.toJSON();
				return String(obj);
			}
			else if (obj instanceof Date) return '"' + obj.toJSON() + '"';
			else {
				var n, v, json = [], arr = (obj && obj.constructor == Array);
				for (n in obj) {
					v = obj[n]; t = typeof v;
					if (t != 'function') {
						if (t == "string") v = v.toJSON();
						if (t == "undefined") v = null;
						else if (t == "object" && v !== null) v = JSON.stringify(v);
						json.push((arr ? "" : '"' + n + '":') + String(v));
					}
				}
				return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
			}
		};

	// A custom JSON.stringify version which omits the properties with undefined values
	if (typeof JSON.stringifyNotNull !== 'function')
		JSON.stringifyNotNull = function (obj) {
			var t = typeof obj;
			if (t != "object" || obj === null) {
				if (t == "string") obj = obj.toJSON();
				return String(obj);
			}
			else if (obj instanceof Date) return '"' + obj.toJSON() + '"';
			else {
				var n, v, json = [], arr = (obj && obj.constructor == Array);
				for (n in obj) {
					v = obj[n];
					if (v != null) {
						t = typeof v;
						if (t != 'function' && t != 'undefined') {
							if (t == "string") v = v.toJSON();
							else if (t == "object" && v !== null) {
								if ((v = JSON.stringifyNotNull(v)) == 'null')
									continue;
							}
							json.push((arr ? "" : '"' + n + '":') + String(v));
						}
					}
				}
				return (json.length == 0) ? "null" : (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
			}
		};

	if (typeof Date.prototype.toJSON !== 'function') {
		Date.prototype.toJSON = function (key) {
			function f(n) {
				return n < 10 ? '0' + n : n;
			}
			if (isFinite(this.valueOf())) {
				var timeOff = -this.getTimezoneOffset() / 60;
				return this.getFullYear() + '-' +
					f(this.getMonth() + 1) + '-' +
					f(this.getDate()) + 'T' +
					f(this.getHours()) + ':' +
					f(this.getMinutes()) + ':' +
					f(this.getSeconds()) +
					(timeOff == 0 ? 'Z' : ((timeOff > 0 ? '+' : '') + f(timeOff) + ':00'));
			}
			else
				return null;
		};

		Number.prototype.toJSON =
		Boolean.prototype.toJSON = function (key) {
			return this.valueOf();
		};
	}

	String.prototype.toJSON = function () {
		return '"' + this.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
	};
})();
