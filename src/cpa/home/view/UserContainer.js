define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/text!./resources/users/UserContainer.html",
	"fsp/AppGlobals",
	"fsp/admin/view/UserDetails",
	"dojo/on",
	"dojo/store/Memory",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/store/Observable",
	"dojo/_base/array",
	"dijit/layout/BorderContainer",
	"dijit/layout/_ContentPaneResizeMixin",
	"dojo/i18n!./nls/User",
	"dojo/_base/lang",
	"indium/view/List",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"dijit/Destroyable"
], function (
	declare,
	_WidgetBase,
	_TemplatedMixin,
	_WidgetsInTemplateMixin,
	template,
	AppGlobals,
	UserDetails,
	on,
	Memory,
	domAttr,
	domClass,
	Observable,
	arrayUtil,
	BorderContainer,
	_ContentPaneResizeMixin,
	l10n,
	lang,
	List,
	TabContainer,
	ContentPane,
	Destroyable
) {

	/**
	 * @module
	 * @description Creates the Users layout with the tabs for User detail and Groups
	 */
	return declare("fsp.admin.view.UserContainer", [BorderContainer, _WidgetBase, _TemplatedMixin,
		_WidgetsInTemplateMixin, Destroyable], {

		/**
		 * @field
		 * @description The HTML template for this widget
		 * @type {string}
		 */
		templateString: template,

		/**
		 * @field
		 * @description The nls entries for this widget
		 * @type {Object}
		 */
		l10n: l10n,

		/**
		 * @field
		 * @description Holds the view of user details widget
		 * @type {Object}
		 */
		_userDetails: {},

		/**
		 * @field
		 * @description The list for holding the users
		 * @type {Object}
		 */
		userList: null,

		/**
		 * @field
		 * @description The tree widget for holding the groups for a selected user
		 * @type {Object}
		 */
		userGroupsTree: null,

		/**
		 * @field
		 * @description The store used to hold the users data
		 * @type {Object}
		 */
		usersDataStore: null,

		/**
		 * @field
		 * @description Stores the groups of selected groups in a tree
		 * @type {Array}
		 */
		selectedGroups: null,

		/**
		 * @field
		 * @description Stores user groups information
		 * @type {Array | Object}
		 */
		userGroups: {},

		/**
		 * @field
		 * @description Stores the id of the selected user
		 * @type {string}
		 */
		userId: null,

		/**
		 * @description Holds the types of Group relations
		 * @type {string}
		 * @private
		 * @const
		 */
		_GROUP_RELATION_TYPES: "3",

		/**
		 * @description Holds the value of direct group membership
		 * @type {string}
		 * @private
		 * @const
		 */
		_DIRECT_MEMBERSHIP: "1",

		/**
		 * @description Holds the value of in-direct group membership
		 * @type {string}
		 * @private
		 * @const
		 */
		_INDIRECT_MEMBERSHIP: "2",

		/**
		 * @function
		 * @param {Object} data Data of all the users
		 * @description Setting the users data to userList widget and prepares users data store
		 * @private
		 */
		_setUsersAttr: function (data) {
			var userData = data.results,
				rowId = 0,
				user;
			for (rowId = 0; rowId < userData.length; rowId += 1) {
				user = userData[rowId];
				user.name = user.firstName + " " + user.lastName;
			}
			this.userList.set("data", userData);
			this._createUsersDataStore(userData);
		},

		/**
		 * @function
		 * @description Display default tab
		 */
		selectDefaultTab: function () {
			this.dapTabUserContainer.selectChild(this.dapTabDefCont);
		},

		/**
		 * @constructor
		 * @description Dijit lifecycle constructor
		 */
		constructor: function () {
			this.usersDataStore = new Observable(new Memory({
				"idProperty": "userId"
			}));
		},

		/**
		 * @function
		 * @description Dijit lifecycle call if UserContainer is in the constructor arguments
		 * object
		 */
		postCreate: function () {
			this.userList = new List({"searchable": true,
										identifierField: "userId"})
								.placeAt(this.dapUsersList);

			this.userGroupsTree = new List({"searchable": true,
												identifierField: "id",
												"tree": true,
												"searchEndPoint": "tree/search",
												"multiSelect": true})
										.placeAt(this.dapUserGroupsTree);

			this.own(
				on(this.userList, "li:itemSelect", lang.hitch(this, "_onUserItemSelected")),
				on(this.dapNewUserAnchor, "click", lang.hitch(this, "onShowNewUser", "new")),
				on(this.dapExportButton, "click", lang.hitch(this, "_exportUsers")),
				on(this.dapUserGroupsEditAnchor, "click",
					lang.hitch(this, "onShowEditUsersMemberships"))
			);

			this._userDetails = new UserDetails().placeAt(this.dapDisplayUserDetails);
			this.inherited(arguments);
		},

		/**
		 * @function
		 * @return {Object} returns the object that has the view of the user details widgets
		 * @description Getter for user details widget
		 */
		getUserDetails: function () {
			return this._userDetails;
		},

		/**
		 * @function
		 * @param {Object} response The response from the REST call
		 * @description Setting user groups data from response to tree view widget
		 */
		showAllGroups: function (response) {
			var client = [];
			response.disabled = true;
			client.push(response);
			this.userGroupsTree.set("data", client);
			this.userGroupsTree.set("disabled", true);
			this.userGroupsTree.expandAll();
		},

		/**
		 * @function
		 * @param {Object} event The selected user event
		 * @description Gives the record of the selected user and gets his groups
		 * @private
		 */
		_onUserItemSelected: function (event) {
			var user = event.item;
			domAttr.set(this.dapShowUserName, "innerHTML", user.name);
			this.onUserSelected("userSelected", user);
		},

		/**
		 * @function
		 * @description Displays the edit link on selection of a user in the user groups tab
		 */
		showUserGroupsEditLink: function () {
			domClass.replace(this.dapUserGroupsEditAnchor, "userContainerAnchor", "hidden");
		},

		/**
		 * @function
		 * @param {Object} response The response from the REST call
		 * @description Prepare selected tree groups and highlight selected groups of tree
		 */
		showUserGroups: function (response) {
			var userGroupIds = response.identifiers,
				i = 0,
				selectedGroups,
				groups = [];

			this.selectedUserGroupIds = {};
			this.userGroups = {};

			this.userGroupsTree.get("observableStore").query({}).forEach(lang.hitch(this,
				function (group) {
					group.relationship = 0;
					this.selectedUserGroupIds[group.id] = group;
				}));

			arrayUtil.forEach(userGroupIds, lang.hitch(this, function (groupId) {
				groups[groupId] = groupId;
			}));

			this._assignGroupsRelationship(groups);
			selectedGroups = this._getSelectedGroups();
			this.onUserGroups(this.userGroups);

			this.userGroupsTree.set("selected", selectedGroups, true);
			this.userGroupsTree.set("disabled", true);
			this.userGroupsTree.expandAll();
		},

		/**
		 * @function
		 * @returns {Object} selectedGroups returns selected groups
		 * @description To get the selected groups in a tree and add relation whether the group is
		 * directly related {1}, indirectly related {2}
		 * @private
		 */
		_getSelectedGroups: function () {
			var key,
				relation,
				i,
				selectedGroups = [];

			for (i = 0; i < this._GROUP_RELATION_TYPES; i += 1) {
				this.userGroups[i] = [];
			}
			for (key in this.selectedUserGroupIds) {
				if (this.selectedUserGroupIds.hasOwnProperty(key)) {
					relation = this.selectedUserGroupIds[key].relationship;
					if (relation === this._DIRECT_MEMBERSHIP || relation === this._INDIRECT_MEMBERSHIP) {
						selectedGroups.push(key);
					}
					this.userGroups[relation].push(key);
				}
			}
			return selectedGroups;
		},

		/**
		 * @function
		 * @param {Object} param Group memberships of the selected user
		 * @description Stub for firing "userGroups" event
		 */
		onUserGroups: function (param) {},

		/**
		 * @function
		 * @param {Array} groups Groups of the user
		 * @description Get the selected groups in a tree and assign a relation to the group
		 * specifying whether the group is directly related {1}, or indirectly related {2}
		 * @private
		 */
		_assignGroupsRelationship: function (groups) {
			this.userGroupsTree.get("observableStore").query({}).forEach(lang.hitch(this,
				function (group) {
					if (group.relationship !== this._INDIRECT_MEMBERSHIP) {
						if (groups[group.id]) {
							group.relationship = this._DIRECT_MEMBERSHIP;
							this.selectedUserGroupIds[group.id] = group;

							if (group.hasChildren) {
								this._assignChildGroupsRelationship(group);
							}
						}
					}
				}));
		},

		/**
		 * @function
		 * @param {Object} group Group information
		 * @description Get the child groups of the selected groups in a tree and assign a relation
		 * to the group specifying whether the group is directly related {1}, or indirectly
		 * related {2}
		 * @private
		 */
		_assignChildGroupsRelationship: function (group) {
			arrayUtil.forEach(group.children, lang.hitch(this, function (childGroup) {
				childGroup.relationship = this._INDIRECT_MEMBERSHIP;
				this.selectedUserGroupIds[childGroup.id] = childGroup;
				if (childGroup.hasChildren) {
					this._assignChildGroupsRelationship(childGroup);
				}
			}));
		},

		/**
		 * @function
		 * @description Stub for firing of "showEditUsersMemberships" event
		 */
		onShowEditUsersMemberships: function () {},

		/**
		 * @function
		 * @param {string} userId Id of the selected user
		 * @description Highlights the selected group member in user list and gives his record
		 */
		selectedGroupMember: function (userId) {
			var selectedUserIds = [];
			selectedUserIds.push(userId);

			arrayUtil.forEach(this.usersDataStore.query({"userId": userId}),
				lang.hitch(this, function (userRecord) {
					domAttr.set(this.dapShowUserName, "innerHTML", userRecord.name);
					this.userList.set("selected", selectedUserIds, true);
					this.onUserSelected(userRecord);
				}));
		},

		/**
		 * @function
		 * @param {Object} usersData Contains all users details
		 * @description Sets the data of all the users to the store
		 * @private
		 */
		_createUsersDataStore: function (usersData) {
			if (lang.isArray(usersData)) {
				this.usersDataStore.setData(usersData);
			}
		},

		/**
		 * @function
		 * @param {string} actionName Holds the name of the action performed
		 * @description Stub for firing "showNewUser" event
		 */
		onShowNewUser: function (actionName) {},

		/**
		 * @function
		 * @param {string} actionName Holds the name of the action performed
		 * @param {Object} userData The record of the selected user
		 * @description Stub for firing of "userSelected" event
		 */
		onUserSelected: function (actionName, userData) {},

		/**
		 * @function
		 * @name fsp.admin.view.UserContainer._exportUsers
		 * @description Exports the list of users to a csv file
		 * @private
		 */
		_exportUsers: function () {
			var exportUrl = [
					AppGlobals.APPLICATION_NAME,
					lang.replace(AppGlobals.rest.EXPORT_USERS, {
						/* TODO ClientId hardcoded for now. This will be corrected when we implement the Roles and
						   Permissions (Part 2) in Sprint 12
						 */
						"clientId": "CLIENT_ID_2"
					})
				].join("/"),
				csvWindow = window.open(exportUrl, "_blank");
		csvWindow.focus();
	}
	});
});
