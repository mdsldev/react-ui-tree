var cx = require('classnames');
var React = require('react');
var ReactDOM = require('react-dom');
var isUndefined = require('lodash/isUndefined');
var TreeEvent = require('./treeEvent');

/**
 * See: https://github.com/cheton/react-sortable
 * See: https://github.com/RubaXa/Sortable
 *
 * For ideas on how dragging was implemented into source code
 */
var Node = React.createClass({
  displayName: 'UITreeNode',

  renderCollapse() {
    var index = this.props.index;

    if(index.children && index.children.length) {
      var collapsed = index.node.collapsed;
      var style = this.props.style;

      return (
        <span
          className={cx('collapse', collapsed ? 'caret-right' : 'caret-down')}
          style={style.mNode.collapse}
          onMouseDown={function(e) {e.stopPropagation()}}
          onClick={this.handleCollapse}>
          {collapsed ? '+' : '-'}
        </span>
      );
    }

    return null;
  },

  renderChildren() {
    var index = this.props.index;
    var tree = this.props.tree;
    var dragging = this.props.dragging;

    if(index.children && index.children.length) {
      var childrenStyles = {};
      if(index.node.collapsed) childrenStyles.display = 'none';
      childrenStyles['paddingLeft'] = this.props.paddingLeft + 'px';

      return (
        <div className="children" style={childrenStyles}>
          {index.children.map((child) => {
            var childIndex = tree.getIndex(child);
            return (
              <Node
                tree={tree}
                index={childIndex}
                key={childIndex.id}
                dragging={dragging}
                style={this.props.style}
                paddingLeft={this.props.paddingLeft}
                onCollapse={this.props.onCollapse}
                onDragStart={this.props.onDragStart}
                onDragEnd={this.props.onDragEnd}
                onDragOver={this.props.onDragOver}
              />
            );
          })}
        </div>
      );
    }

    return null;
  },

  render() {
    var tree = this.props.tree;
    var index = this.props.index;
    var dragging = this.props.dragging;
    var draggable = true;
    var node = index.node;
    var style = this.props.style;
    var placeHolderStyle = index.id === dragging ? style.mNode.placeHolder : {};

    if (!isUndefined(this.props.index.node.draggable) && !this.props.index.node.draggable) {
      draggable = false;
    }

    return (
      <div
        className={cx('m-node', {
          'placeholder': index.id === dragging
        })}
        style={placeHolderStyle}
        data-id={index.id}
        onDragOver={this.handleDragOver}
      >
        <div
          className="inner"
          ref="inner"
          style={style.mNode.inner}
          draggable={draggable}
          onDragStart={this.handleDragStart}
          onDrop={this.handleDragEnd}
          data-parent-id={tree.id}
        >
          {this.renderCollapse()}
          {tree.renderNode(node)}
        </div>
        {this.renderChildren()}
      </div>
    );
  },

  handleCollapse(e) {
    e.stopPropagation();
    var nodeId = this.props.index.id;
    if(this.props.onCollapse) this.props.onCollapse(nodeId);
  },

  handleMouseDown(e) {
    var nodeId = this.props.index.id;
    var nodeDraggable = this.props.index.node.draggable;
    var dom = this.refs.inner;

    // don't allow drag (only if user specified it's not draggable)
    if (!isUndefined(nodeDraggable) && !nodeDraggable) {
      return;
    }

    if(this.props.onDragStart) {
      this.props.onDragStart(nodeId, dom, e);
    }
  },

  /**
   * New event for handling dragging rather than mouse downs
   * @param e
   */
  handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      origin: this.props.tree.id,
      nodeData: this.props.index
    }));
    var dom = this.refs.inner;
    if (this.props.onDragStart) {
      this.props.onDragStart(this.props.index.id, dom, e);
    }
  },

  /**
   * New event for handling drag ends
   * @param e
   */
  handleDragEnd(e) {
    var dom = this.refs.inner;
    var endData = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (this.props.onDragEnd) {
      this.props.onDragEnd(this.props.index.id, dom, e, endData);
    }
  },

  /**
   * New event for handling drag overs
   * @param e
   */
  handleDragOver(e) {
    var dom = this.refs.inner;
    e.dataTransfer.dropEffect = 'move';
    if (this.props.onDragOver) {
      this.props.onDragOver(this.props.index.id, dom, e, this.props.tree.id);
    }
  },
});

module.exports = Node;
