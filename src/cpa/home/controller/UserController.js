define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"fsp/admin/view/UserContainer",
	"dojo/text!./resources/UserController.html",
	"fsp/admin/view/NewUser",
	"fsp/admin/view/EditUserDetails",
	"fsp/admin/view/EditUsersMemberships",
	"dijit/_TemplatedMixin",
	"dojo/i18n!./nls/UserController",
	"dojo/date/locale",
	"indium/base/request",
	"indium/base/message",
	"fsp/AppGlobals",
	"indium/AppGlobals",
	"dojo/_base/lang",
	"indium/view/SceneGraph",
	"dojo/on",
	"dijit/Destroyable",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"dijit/layout/_ContentPaneResizeMixin"
], function (
	declare,
	_WidgetBase,
	UserContainer,
	template,
	NewUser,
	EditUserDetails,
	EditUsersMemberships,
	_TemplatedMixin,
	l10n,
	date,
	request,
	message,
	AppGlobals,
	IndiumGlobals,
	lang,
	SceneGraph,
	on,
	Destroyable,
	TabContainer,
	ContentPane,
	_ContentPaneResizeMixin
) {

	/**
	 * @module
	 * @description This widget handles communication between user widgets
	 */
	return declare("fsp.admin.control.UserController", [_WidgetBase, _TemplatedMixin, Destroyable, _ContentPaneResizeMixin], {

		/**
		 * @field
		 * @description the HTML template for this widget
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
		 * @description The name of the new user view that is to be added to the scene graph
		 * @type {string}
		 * @private
		 * @const
		 */
		_NEW_USER: "newUser",

		/**
		 * @description The name of the edit user details view that is to be added to the scene graph
		 * @type {string}
		 * @private
		 * @const
		 */
		_EDIT_USER_DETAILS: "editUserDetails",

		/**
		 * @description The name of the edit user memberships view that is to be added to the
		 * scene graph
		 * @type {string}
		 * @private
		 * @const
		 */
		_EDIT_USER_MEMBERSHIP: "editUserMemberships",

		/**
		 * @description The name of the users view that is to be added to the scene graph
		 * @type {string}
		 * @private
		 * @const
		 */
		_USER_CONTAINER: "users",

		/**
		 * @field
		 * @description Holds the scene graph of the user management
		 * @type {Object}
		 * @private
		 * @const
		 */
		_sceneGraph: null,

		/**
		 * @field
		 * @description Holds the scene graph of the user management
		 * @type {Object}
		 * @private
		 */
		_users: null,

		/**
		 * @field
		 * @description Holds the view of user details
		 * @type {Object}
		 * @private
		 */
		_userDetails: {},

		/**
		 * @field
		 * @description Holds the view of new user
		 * @type {Object}
		 * @private
		 */
		_newUser: null,

		/**
		 * @field
		 * @description Holds the view of the edit user details
		 * @type {Object}
		 * @private
		 */
		_editUserDetails: null,

		/**
		 * @field
		 * @description Holds the view of the edit user memberships
		 * @type {Object}
		 * @private
		 */
		_editUserMemberships: null,

		/**
		 * @field
		 * @description Stores the data for all groups
		 * @type {Object}
		 */
		groupsData: null,

		/**
		 * @field
		 * @description Stores the id of the user
		 * @type {string}
		 */
		userId: null,

		/**
		 * @field
		 * @description The flag for handling show/hide of edit link in user groups and user
		 * details tabs
		 * @type {boolean}
		 * @private
		 */
		_userEditable: true,

		/**
		 * @function
		 * @override dijit._WidgetBase
		 * @description Dijit lifecycle postCreate
		 */
		postCreate: function () {
			this._setupSceneGraph();
			this._setupUserPages();
			this._getUsers();
			this._getGroups();
			this._setupEventHandlers();
			this._sceneGraph.startup();
			this._sceneGraph.selectChild(this._USER_CONTAINER);
			this.inherited(arguments);
		},

		/**
		 * @function
		 * @description Sets up the SceneGraph
		 * @private
		 */
		_setupSceneGraph: function () {
			this._sceneGraph = new SceneGraph({}).placeAt(this.domNode, "first");
		},

		/**
		 * @function
		 * @description Sets up all the pages that the user controller delegates to
		 * @private
		 */
		_setupUserPages: function () {
			this._users = new UserContainer();
			this._sceneGraph.addContentPane(this._USER_CONTAINER, this._users);

			this._userDetails = this._users.getUserDetails();

			this._newUser = new NewUser();
			this._sceneGraph.addContentPane(this._NEW_USER, this._newUser);

			this._editUserDetails = new EditUserDetails();
			this._sceneGraph.addContentPane(this._EDIT_USER_DETAILS, this._editUserDetails);

			this._editUserMemberships = new EditUsersMemberships();
			this._sceneGraph.addContentPane(this._EDIT_USER_MEMBERSHIP, this._editUserMemberships);
		},

		/**
		 * @function
		 * @description Sets up all the event handlers of the controller
		 * @private
		 */
		_setupEventHandlers: function () {
			this.own(
				on(this._users, "userSelected", lang.hitch(this, "_getAllRoles")),
				on(this._users, "showNewUser", lang.hitch(this, "_getAllRoles")),
				on(this._users, "showEditUsersMemberships", lang.hitch(this, function () {
					this._editUserMemberships.showEditUserMembership(this.groupsData);
					this._sceneGraph.selectChild(this._EDIT_USER_MEMBERSHIP);
				})),
				on(this._users, "userGroups", lang.hitch(this, function (userGroups) {
					this._editUserMemberships.setUserGroups(userGroups);
				})),
				on(this._userDetails, "showEditUserDetails", lang.hitch(this, function () {
					this._editUserDetails.prepareUnassignedRoles();
					this._editUserDetails.set("value", this.assignedRoleResponse);
					this._sceneGraph.selectChild(this._EDIT_USER_DETAILS);
				})),
				on(this._newUser, "newUser", lang.hitch(this, "_createUser")),
				on(this._newUser, "returnToUserContainer",
					lang.hitch(this, "_returnToUserContainer")),
				on(this._editUserDetails, "updateUser", lang.hitch(this, "_updateUserDetails")),
				on(this._editUserDetails, "returnToUserContainer",
					lang.hitch(this, "_returnToUserContainer")),
				on(this._editUserMemberships, "returnToUserContainer",
					lang.hitch(this, "_returnToUserContainer")),
				on(this._editUserMemberships, "editUserGroups",
					lang.hitch(this, "_updateUserGroups"))
			);
		},

		/**
		 * @function
		 * @param {string} actionName Holds the type of action being performed
		 * @param {Object} selectedUser Holds the details of the selected user
		 * @description Checks and retrieves all the roles of a new user
		 * @private
		 */
		_getAllRoles: function (actionName, selectedUser) {
			if (!this.isAllRolesAvailable) {
				this.isAllRolesAvailable = true;
				this._showUserGlobalRoles();
			}

			if (actionName === "new") {
				this._newUserGroups();
			} else if (actionName === "userSelected") {
				this._editUserDetails.rolesEdited = false;
				this.userId = selectedUser.userId;
				this._getUserGroups(this.userId);

				this._getSelectedUserDetails(this.userId);
				if (this._userEditable) {
					this._showUsersEditLink();
				}
				this._users.selectDefaultTab();
			}
		},

		/**
		 * @function
		 * @param {Object} selectedUser Selected user object
		 * @description Populates the selected user details in user details and edit user details
		 * widgets and invokes a REST call for obtaining the selected user's memberships
		 * @private
		 */
		_onUserSelected : function (selectedUser) {
			this.userId = selectedUser.userId;
			this._getUserGroups(this.userId);

			this._getSelectedUserDetails(this.userId);
			if (this._userEditable) {
				this._showUsersEditLink();
			}
		},

		/**
		 * @function
		 * @param {string} userId Selected user id
		 * @description Navigates to users page when user is selected from groups and display
		 * details of selected user
		 */
		showSelectedUserDetails: function (userId) {
			this._showUsersEditLink();
			this._users.selectedGroupMember(userId);
			this._sceneGraph.selectChild(this._USER_CONTAINER);
			this._onUserSelected({"userId": userId});
		},

		/**
		 * @function
		 * @description Invokes individual functions in user container and user details to display
		 * the edit link on selection of a user and changes the flag to false. This is to ensure
		 * that, there is no possibility of navigation to edit user memberships page or edit user
		 * details page when no user is selected
		 * @private
		 */
		_showUsersEditLink: function () {
			this._users.showUserGroupsEditLink();
			this._userDetails.showUserDetailsEditLink();
			this._userEditable = false;
		},

		/**
		 * @function
		 * @param {string} userId Holds the id of selected user
		 * @param {Object} usersData Holds users data
		 * @description Displays current selected user details when users reloaded
		 * @private
		 */
		_showCurrentSelectedUserDetails: function (userId, usersData) {
			var i;
			for (i = 0; i < usersData.length; i += 1) {
				if (usersData[i].userId === userId) {
					this._onUserSelected(usersData[i]);
					break;
				}
			}
		},

		/**
		 * @function
		 * @param {string} navigationActionName The navigate action name that was performed
		 * @description Returns to the Users landing page, refreshing the user list
		 * @private
		 */
		_returnToUserContainer: function (navigationActionName) {
			if (navigationActionName === "update") {
				this._getSelectedUserDetails(this.userId);
				this._showUserGlobalRoles();
			}
			this._getUsers();
			this._sceneGraph.selectChild(this._USER_CONTAINER);
		},

		/**
		 * @function
		 * @description REST call to get users for current client
		 * @private
		 */
		_getUsers: function () {
			var userId;
			request.get(AppGlobals.rest.CURRENT_CLIENT_USERS_LIST, {
				"appId": AppGlobals.APPLICATION_NAME
			}).then(lang.hitch(this, function (response) {
				this._users.set("users", response);
				userId = this.userId;
				if (userId) {
					this._users.userList.set("selected", [userId], true);
					this._showCurrentSelectedUserDetails(userId, response.results);
				}
			}));
		},

		/**
		 * @function
		 * @description REST call to get groups for current user
		 * @private
		 */
		_getGroups: function () {
			request.get(AppGlobals.rest.CURRENT_USER_GROUPS_HIERARCHY, {
				"appId": AppGlobals.APPLICATION_NAME
			}).then(lang.hitch(this, function (response) {
				this.groupsData = response;
				this._users.showAllGroups(response);
			}));
		},

		/**
		 * @function
		 * @param {string} userId Selected user id
		 * @description REST call to get user memberships for a selected user
		 * @private
		 */
		_getUserGroups: function (userId) {
			request.get(AppGlobals.rest.SELECTED_USER_GROUPS, {
				"appId": AppGlobals.APPLICATION_NAME,
				"requestArgs": {userId: userId}
			}).then(lang.hitch(this, function (response) {
				this._users.showUserGroups(response);
			}));
		},

		/**
		 * @function
		 * @description REST call to get groups for assigning the memberships to the new user
		 * @private
		 */
		_newUserGroups: function () {
			request.get(AppGlobals.rest.CURRENT_USER_GROUPS_HIERARCHY, {
				"appId": AppGlobals.APPLICATION_NAME
			}).then(lang.hitch(this, function (response) {
				// Reset the New User form fields.
				this._newUser.reset();
				// Load the tree data.
				this._newUser.populateNewUserGroupsTree(response);
				// Switch to NewUser view.
				this._sceneGraph.selectChild(this._NEW_USER);
			}));
		},

		/**
		 * @function
		 * @param {Object} userId Id of the selected user
		 * @description Gets the details of the selected user
		 * @private
		 */
		_getSelectedUserDetails: function (userId) {
			var selectedUser;
			request.get(AppGlobals.rest.SELECTED_USER_DETAILS, {
				"appId": AppGlobals.APPLICATION_NAME,
				"requestArgs": { "userId": userId }
			}).then(lang.hitch(this, function (response) {
				selectedUser = response;
				this._userDetails.setUserDetails(selectedUser);
				this._editUserDetails.set("value", selectedUser);
				this.assignedRoleResponse = selectedUser;
				this._editUserDetails.set("assignedRoles", selectedUser);
			}));
		},

		/**
		 * @function
		 * @description To get the unassigned global roles of a user
		 * @private
		 */
		_showUserGlobalRoles: function () {
			request.get(AppGlobals.rest.USER_GLOBAL_ROLES, {
				"appId": AppGlobals.APPLICATION_NAME
			}).then(lang.hitch(this, function (response) {
				// Load the list data.
				this.globalRoleResponse = response;
				// Load the list data.
				this._newUser.globalRoleList = response;
				this._editUserDetails.globalRoles = response;
				// Switch to NewUser view.
				this._showUserCustomRoles();
			}));
		},

		/**
		 * @function
		 * @description To get the unassigned custom roles
		 * @private
		 */
		_showUserCustomRoles: function () {
			request.get(AppGlobals.rest.USER_CUSTOM_ROLES, {
				"appId": AppGlobals.APPLICATION_NAME
			}).then(lang.hitch(this, function (response) {
				// Reset the New User form fields.
				this._editUserDetails.reset();
				this._newUser.reset();
				// Load the list data.
				this.customRoleResponse = response;
				this._editUserDetails.set("customRoles", response);
				// Load the list data.
				this._newUser.set("customRoles", response);
			}));
		},

		/**
		 * @function
		 * @param {Object} newUserData New user details to create
		 * @description REST call to create new user. Shows the user container page on success
		 * @private
		 */
		_createUser: function (newUserData) {
			request.post(AppGlobals.rest.CREATE_USER, {
				"appId": AppGlobals.APPLICATION_NAME,
				"data": newUserData
			}).then(lang.hitch(this, "_createUserRestResponse"));
		},

		/**
		 * @function
		 * @param {Object} response Holds the response of the REST call
		 * @description Provides success/failure status message depending on the response of
		 * the REST call
		 * @private
		 */
		_createUserRestResponse: function (response) {
			if (response.success) {
				this._returnToUserContainer("create");
				message.success(l10n.userCreated);
			} else {
				message.error(l10n.errorCreating);
			}
		},

		/**
		 * @function
		 * @param {Object} updatedUserData Holds the edited user data
		 * @description REST call to update the user details
		 * @private
		 */
		_updateUserDetails: function (updatedUserData) {
			request.post(AppGlobals.rest.SAVE_USER, {
				"appId": AppGlobals.APPLICATION_NAME,
				"requestArgs": {userId: this.userId },
				"data": updatedUserData
			}).then(lang.hitch(this, "_updateUserRestResponse"));
		},

		/**
		 * @function
		 * @param {Object} response Holds the response of the REST call
		 * @description Provides success/failure status message depending on the response of
		 * the REST call
		 * @private
		 */
		_updateUserRestResponse: function (response) {
			if (response.success) {
				this._returnToUserContainer("update");
				message.success(l10n.userEdited);
			} else {
				message.error(l10n.errorEditing);
			}
		},

		/**
		 * @function
		 * @param {Object} userGroupsData users group data to update
		 * @description REST call to update user's groups. Shows the user container page on success
		 * @private
		 */
		_updateUserGroups: function (userGroupsData) {
			userGroupsData.userId = this.userId;
			request.post(AppGlobals.rest.SAVE_USER_GROUPS, {
				"appId": AppGlobals.APPLICATION_NAME,
				"requestArgs": {userId: this.userId },
				"data": userGroupsData
			}).then(lang.hitch(this, "_updateUserGroupRestResponse"));
		},

		/**
		 * @function
		 * @param {Object} response Holds the response of the REST call
		 * @description Provides success/failure status message depending on the response of
		 * the REST call
		 * @private
		 */
		_updateUserGroupRestResponse: function (response) {
			if (response.success) {
				this._returnToUserContainer("update");
				message.success(l10n.userGroupsSaved);
			} else {
				message.error(l10n.errorEditing);
			}
		}
	});
});
