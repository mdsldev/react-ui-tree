var React = require('react');
var extend = require('lodash/extend');
var cloneDeep = require('lodash/cloneDeep');
var Tree = require('./tree');
var Node = require('./node');
var TreeEvent = require('./treeEvent');

module.exports = React.createClass({
  displayName: 'UITree',

  propTypes: {
    tree: React.PropTypes.object.isRequired,
    paddingLeft: React.PropTypes.number,
    renderNode: React.PropTypes.func.isRequired,
    id: React.PropTypes.string.isRequired,
    copyElements: React.PropTypes.bool,
  },

  componentDidMount() {
    document.addEventListener(TreeEvent.EVENT_REMOVE_NODE, this.onEventNodeRemove.bind(this), false);
  },

  componentWillUnmount() {
    document.removeEventListener(TreeEvent.EVENT_REMOVE_NODE, this.onEventNodeRemove.bind(this), false);
  },

  onEventNodeRemove(e) {
    if (e.detail) {
      var tree = this.state.tree;

      // origin = this but landed somewhere different? remove it
      if (this.state.tree.id === e.detail.origin && this.state.tree.id !== e.detail.destination) {
        tree.remove(tree.getIdByName(e.detail.nodeData.node.module).id);
        tree.updateNodesPosition();
        this.setState({ tree });
        this.change(tree);
        return;
      }

      // origin = not this but destination is here?
      if (this.state.tree.id !== e.detail.origin && this.state.tree.id === e.detail.destination) {
        tree.append(e.detail.nodeData.node, 1);
        tree.updateNodesPosition();
        this.setState({ tree });
        this.change(tree);
        return;
      }
    }
  },

  getInternalStyle() {
    const style = {
      fNoSelect: {
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        UserSelect: 'none',
      },
      mNode: {
        placeHolderAll: {
          visibility: 'hidden',
        },
        placeHolder: {
          border: '1px dashed #ccc',
          backgroundColor: 'cornflowerblue',
        },
        inner: {
          position: 'relative',
          cursor: 'pointer',
          paddingLeft: '10px',
        },
        collapse: {
          position: 'absolute',
          left: 0,
          cursor: 'pointer',
        },
      },
    };

    style.mTree = extend({}, style.fNoSelect, {
      position: 'relative',
      overflow: 'hidden',
    });

    style.mDraggable = extend({}, style.fNoSelect, {
      position: 'absolute',
      opacity: 0.8,
    });

    return style;
  },

  getDefaultProps() {
    return {
      paddingLeft: 20
    };
  },

  getInitialState() {
    return this.init(this.props);
  },

  componentWillReceiveProps(nextProps) {
    if(!this._updated) this.setState(this.init(nextProps));
    else this._updated = false;
  },

  init(props) {
    var tree = new Tree(props.tree);
    tree.isNodeCollapsed = props.isNodeCollapsed;
    tree.renderNode = props.renderNode;
    tree.id = props.id;
    tree.changeNodeCollapsed = props.changeNodeCollapsed;
    tree.updateNodesPosition();

    return {
      tree: tree,
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null
      }
    };
  },

  getDraggingDom() {
    return null;

    var tree = this.state.tree;
    var dragging = this.state.dragging;
    var style = this.getInternalStyle();

    if(dragging && dragging.id) {
      var draggingIndex = tree.getIndex(dragging.id);
      var draggingStyles = extend({}, style.mDraggable, {
        top: dragging.y,
        left: dragging.x,
        width: dragging.w
      });

      return (
        <div className="m-draggable" style={draggingStyles}>
          <Node
            tree={tree}
            index={draggingIndex}
            paddingLeft={this.props.paddingLeft}
            style={style}
          />
        </div>
      );
    }
    return null;
  },

  render() {
    var tree = this.state.tree;
    var dragging = this.state.dragging;
    var draggingDom = this.getDraggingDom();
    var style = this.getInternalStyle();

    return (
      <div className="m-tree" style={style.mTree}>
        {draggingDom}
        <Node
          tree={tree}
          index={tree.getIndex(1)}
          key={1}
          paddingLeft={this.props.paddingLeft}
          onDragStart={this.dragStart}
          onDragOver={this.dragOver}
          onDragEnd={this.dragEnd}
          onCollapse={this.toggleCollapse}
          dragging={dragging && dragging.id}
          style={style}
        />
      </div>
    );
  },

  dragStart(id, dom, e, node) {
    this.dragging = {
      id: id,
      w: dom.offsetWidth,
      h: dom.offsetHeight,
      x: dom.offsetLeft,
      y: dom.offsetTop,
      currentTarget: e.currentTarget,
    };

    this._startX = dom.offsetLeft;
    this._startY = dom.offsetTop;
    this._offsetX = e.clientX;
    this._offsetY = e.clientY;
    this._start = true;
  },

  dragOver(id, dom, e, treeId) {
    e.preventDefault();
    if (this._start) {
      this.setState({
        dragging: this.dragging
      });
      this._start = false;
    }

    var tree = this.state.tree;
    var dragging = (this.state.dragging && this.state.dragging.id) ? this.state.dragging : this.dragging;
    var paddingLeft = this.props.paddingLeft;
    var newIndex = null;

    // check for any changes (treeId)
    if (!dragging || !dragging.id || !treeId || treeId !== this.state.tree.id) {
      return;
    }

    var index = tree.getIndex(dragging.id);

    // why is this error'ing?
    if (!index || !index.node) {
      return;
    }

    var collapsed = index.node.collapsed;

    var _startX = this._startX;
    var _startY = this._startY;
    var _offsetX = this._offsetX;
    var _offsetY = this._offsetY;

    var pos = {
      x: _startX + e.clientX - _offsetX,
      y: _startY + e.clientY - _offsetY
    };
    dragging.x = pos.x;
    dragging.y = pos.y;

    var diffX = dragging.x - paddingLeft / 2 - (index.left - 2) * paddingLeft;
    var diffY = dragging.y - dragging.h / 2 - (index.top - 2) * dragging.h;

    if (diffX < 0) {
      // left
      if (index.parent && !index.next) {
        newIndex = tree.move(index.id, index.parent, 'after');
      }
    } else if (diffX > paddingLeft) {
      // right
      if (index.prev) {
        var prevNode = tree.getIndex(index.prev).node;
        if (!prevNode.collapsed && !prevNode.leaf) {
          newIndex = tree.move(index.id, index.prev, 'append');
        }
      }
    }

    if (newIndex) {
      index = newIndex;
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    if (diffY < 0) {
      // up
      var above = tree.getNodeByTop(index.top - 1);
      newIndex = tree.move(index.id, above.id, 'before');
    } else if (diffY > dragging.h) {
      // down
      if (index.next) {
        var below = tree.getIndex(index.next);
        if (below.children && below.children.length && !below.node.collapsed) {
          newIndex = tree.move(index.id, index.next, 'prepend');
        } else {
          newIndex = tree.move(index.id, index.next, 'after');
        }
      } else {
        var below = tree.getNodeByTop(index.top + index.height);
        if (below && below.parent !== index.id) {
          if (below.children && below.children.length) {
            newIndex = tree.move(index.id, below.id, 'prepend');
          } else {
            newIndex = tree.move(index.id, below.id, 'after');
          }
        }
      }
    }

    if (newIndex) {
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    this.setState({
      tree: tree,
      dragging: dragging
    });
  },

  dragEnd(id, dom, e, endData) {
    e.stopPropagation();
    const stateOptions = {
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null,
        currentTarget: null,
      },
    };

    this.setState(stateOptions, () => {
      document.dispatchEvent(new CustomEvent(TreeEvent.EVENT_REMOVE_NODE, {
        detail: extend({}, endData, {
          destination: this.state.tree.id,
        }),
      }));
    });
    this.change(this.state.tree);
  },

  change(tree) {
    this._updated = true;
    if(this.props.onChange) this.props.onChange(tree.obj);
  },

  toggleCollapse(nodeId) {
    var tree = this.state.tree;
    var index = tree.getIndex(nodeId);
    var node = index.node;
    node.collapsed = !node.collapsed;
    tree.updateNodesPosition();

    this.setState({
      tree: tree
    });

    this.change(tree);
  }
});
