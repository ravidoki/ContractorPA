define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./resources/users/UserDetails.html",
	"dojo/i18n!./nls/User",
	"dojo/on",
    "dojo/query",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/topic",
	"fsp/AppGlobals",
	"indium/view/List",
	"dijit/Destroyable"
], function (
	declare,
	_WidgetBase,
	_TemplatedMixin,
	_WidgetsInTemplateMixin,
	lang,
	template,
	l10n,
	on,
    query,
	domAttr,
	domClass,
	topic,
	AppGlobals,
	List,
	Destroyable
) {

	/**
	 * @module
	 * @description This widget displays the details of user
	 */
	return declare("fsp.admin.view.UserDetails", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
		Destroyable], {

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
		 * @description The list widget to display the roles assigned to the selected user
		 * @type {Object}
		 */
		userRolesList: null,

		/**
		 * @function
		 * @description Dijit lifecycle postCreate
		 */
		postCreate: function () {
			this.userRolesList = new List({
				"labelField": "name",
				"identifierField": "roleId"
			}).placeAt(this.dapUserRolesList);

			this.own(
				on(this.userRolesList, "li:itemSelect", lang.hitch(this, "_onUserRoleSelected")),
				on(this.dapEditUserSettings, "click", lang.hitch(this, "onShowEditUserDetails"))
			);
			this.inherited(arguments);
		},

		/**
		 * @function
		 * @description Stub for firing of "showEditUserDetails" event
		 */
		onShowEditUserDetails: function () {
		},

		/**
		 * @function
		 * @description Displays the edit link on selection of a user in the user details tab
		 */
		showUserDetailsEditLink: function () {
			domClass.remove(this.dapEditUserSettings, "hidden");
		},

		/**
		 * @function
		 * @param {Object} selectedUser Holds the user details of the selected user
		 * @description Sets the selected user's details to the user details tab
		 */
		setUserDetails: function (selectedUser) {
			domAttr.set(this.dapUserDetailsFirstName, "innerHTML", selectedUser.firstName);
			domAttr.set(this.dapUserDetailsLastName, "innerHTML", selectedUser.lastName);
			domAttr.set(this.dapUserDetailsEmailAddress, "innerHTML", selectedUser.email);
			this.userRolesList.set("data", selectedUser.roles);
		},

		/**
		 * @function
		 * @param {Object} event The selected role event
		 * @description redirects the selected role to the role tab
		 * @private
		 */
		_onUserRoleSelected: function (event) {
			topic.publish(AppGlobals.DISPLAY_ROLE_DETAILS, event);
		}
	});
});
