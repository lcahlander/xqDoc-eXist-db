import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';
import {} from '@polymer/polymer/lib/elements/dom-bind.js';
import '@polymer/app-layout/app-drawer-layout/app-drawer-layout.js';
import '@polymer/app-layout/app-drawer/app-drawer.js';
import '@polymer/app-layout/app-scroll-effects/app-scroll-effects.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '@polymer/app-layout/demo/sample-content.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/paper-toolbar/paper-toolbar.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/iron-location/iron-location.js';
import '@polymer/iron-location/iron-query-params.js';
import '@vaadin/vaadin-grid/vaadin-grid.js';
import '@vaadin/vaadin-grid/vaadin-grid-tree-column.js';
import './module-selector.js';
import './xqdoc-module.js';
import './variable-detail.js';
import './import-detail.js';
import './function-detail.js';




/**
 * @customElement
 * @polymer
 */
class XqdocApp extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          background-color: lightgrey;
          --app-drawer-width: 400px;
        }
        app-drawer-layout {
          background-color: lightgrey;
        }
        section {
          background-color: lightgrey;
        }
      paper-card {
        width: 100%;
      }
      #directory {
        height: 100%;
      }
        paper-item {
          cursor: pointer;
        }
        paper-card {
          width: 100%;
          font-size: 10px;
          margin: 5px;
        }
      app-toolbar {
        background-color: grey;
        color: #fff;
      }
      </style>
      <iron-location id="sourceLocation" query="{{query}}" hash="{{hash}}"></iron-location>
      <iron-query-params id="sourceParams" params-string="{{query}}" params-object="{{params}}"></iron-query-params>
      <iron-ajax id="getdoc"
        url="/exist/restxq/xqdoc/module"  
        params="[[params]]"
        handle-as="json"
        on-response="_moduleResponse"></iron-ajax>
      <paper-dialog id="thespinner" modal>
        <paper-spinner active></paper-spinner>
      </paper-dialog>
      <app-drawer-layout fullbleed>
        <app-drawer slot="drawer">
          <app-toolbar>
            <div main-title>Modules</div>
          </app-toolbar>
          <section style="height: 100%; overflow: auto;">
            <vaadin-grid id="directory" selected-items="{{selected}}">
              <vaadin-grid-tree-column path="name" header="Name"item-has-children-path="hasChildren"></vaadin-grid-tree-column>
            </vaadin-grid>
          <div style="margin-bottom:90px;width:100%;"></div>
        </section>
        </app-drawer>
        <app-header-layout has-scrolling-region>
          <app-header slot="header" fixed effects="waterfall">
          <app-toolbar>
            <paper-icon-button icon="menu" drawer-toggle></paper-icon-button>
            <div main-title>xqDoc</div>
            <paper-toggle-button checked="{{showHealth}}">Show Documentation Health</paper-toggle-button>
          </app-toolbar>
          </app-header>
          <paper-toast id="toast"></paper-toast>
          <div>
          <template is="dom-if" if="{{result.response.uri}}">
            <xqdoc-module show-health="[[showHealth]]" item="{{result.response}}" params="{{params}}" hash="{{hash}}"></xqdoc-module>
            <template is="dom-repeat" items="{{result.response.imports}}">
              <import-detail item="{{item}}"></import-detail>
            </template>
            <template is="dom-repeat" items="{{result.response.variables}}">
              <variable-detail show-health="[[showHealth]]" item="{{item}}" params="{{params}}" hash="{{hash}}"></variable-detail>
            </template>
            <template id="repeatFunctions" is="dom-repeat" items="{{result.response.functions}}">
              <function-detail id="function-[[item.name]]" show-health="[[showHealth]]" item="{{item}}" params="{{params}}" hash="{{hash}}"></function-detail>
            </template>
          </template>
          <paper-card>Created by xqDoc version [[result.response.control.version]] on [[result.response.control.date]]</paper-card>
          <div style="margin-bottom:200px;height:150px;width:100%;"></div>
          </div>
        </app-header-layout>
      </app-drawer-layout>
    `;
  }
  static get properties() {
    return {
      list: { type: Array, notify: true },
      result: { type: Object, notify: true },
      params: { type: Object, notify: true },
      selected: { type: Array, notify: true, observer: '_selectionChanged' },
      hash: { type: String, notify: true, observer: '_hashChanged' },
      showHealth: { type: Boolean, notify: true, value: false },
      selectedSuggestionId: { type: String, notify: true, observer: '_moduleSelected' }
    };
  }

  connectedCallback() {
    super.connectedCallback();

    const grid = this.$.directory;

    this.$.directory.dataProvider = function(params, callback) {

      let url = "/exist/restxq/xqdoc/level" +
      '?page=' + params.page +         // the requested page index
      '&per_page=' + params.pageSize; // number of items on the page

      if (params.parentItem) {
        url += '&path=' + params.parentItem.fullpath;
      }

      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var response = JSON.parse(xhr.responseText);
        callback(
          response.data, // requested page of items
          response.totalSize  // total number of items
        );
      };
      xhr.open('GET', url, true);
      xhr.send();
    };

    this.$.directory.addEventListener('active-item-changed', function(event) {
      const item = event.detail.value;

      if (item && item.hasChildren == false) {
        grid.selectedItems = [item];
      } else {
        grid.selectedItems = [];
      }
    });

    // If there is a hash, wait 2.5 seconds and then call _hashChanged to scroll to the hash.

    var myHash = this.get('hash');

    if (myHash) {
      setTimeout(
        () => this._hashChanged(myHash, ''),
        2500
      );
    }
  }

  _hashChanged(newValue, oldValue) {
    if (newValue != "") {
      var a= '#' + newValue;

      /*
          You cannot refer to the nodes inside template tags, because this.$ is filled 
          at the component initialization time and those templates are not yet stamped.

          The workaround is to use the below function.
      */
      var b = this.shadowRoot.querySelector(a);

      if (b) {
        b.scrollIntoView();
      }
      console.log('scrolled to ' + a);
    }
  }

  _selectionChanged(newValue, oldValue) {
      console.log('scrolled to ');
      if (newValue.length == 1) {
        this.$.sourceParams.paramsString = 'module=' + newValue[0].fullpath ;
        this.$.thespinner.open();
        this.$.getdoc.generateRequest();
      } else {
        this.$.sourceParams.paramsString = '' ;
        this.result = {};
      }
  }

  _moduleSelected(newValue, oldValue) {
    if (newValue != 'None') {
      var p = this.get('params');
      if (p.module != newValue) {
        if (this.result.response) {
          this.result.response.functions.splice();
        }
        this.set( 'params', { module: newValue }  );
        this.set( 'hash', '');
        this.notifyPath('params');
      }
    }
  }

  _moduleResponse(e) {
    var resp = e.detail.response;
    this.result = resp;
    this.$.thespinner.close();
  }

}

window.customElements.define('xqdoc-app', XqdocApp);
