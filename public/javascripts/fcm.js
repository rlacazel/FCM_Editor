var fcms = null;

function init() {
    var $ = go.GraphObject.make;
    var NodeType = {"state":1, "event":2, "action":3};

    myDiagram =
        $(go.Diagram, "myDiagramDiv",  // create a Diagram for the DIV HTML element
            {
                // position the graph in the middle of the diagram
                initialContentAlignment: go.Spot.Center,

                // allow double-click in background to create a new node
                "clickCreatingTool.archetypeNodeData": { text: "Node", color: "white" },

                // allow Ctrl-G to call groupSelection()
                "commandHandler.archetypeGroupData": { text: "Group", isGroup: true, color: "blue" },

                // enable undo & redo
                "undoManager.isEnabled": true
            });
    myDiagram.allowDrop = true;  // permit accepting drag-and-drops
    // Define the appearance and behavior for Nodes:

    // First, define the shared context menu for all Nodes, Links, and Groups.


    function nodeStyle() {
        return [
            // The Node.location comes from the "loc" property of the node data,
            // converted by the Point.parse static method.
            // If the Node.location is changed, it updates the "loc" property of the node data,
            // converting back using the Point.stringify static method.
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            {
                // the Node.location is at the center of each node
                locationSpot: go.Spot.Center,
                //isShadowed: true,
                //shadowColor: "#888",
                // handle mouse enter/leave events to show/hide the ports
                mouseEnter: function (e, obj) { showSmallPorts(obj.part, true); },
                mouseLeave: function (e, obj) { showSmallPorts(obj.part, false); }
            }
        ];
    }

    function showSmallPorts(node, show) {
        node.ports.each(function(port) {
            if (port.portId !== "") {  // don't change the default port, which is the big shape
                port.fill = show ? "rgba(0,0,0,.3)" : null;
            }
        });
    }



    // To simplify this code we define a function for creating a context menu button:
    function makeButton(text, action, visiblePredicate) {
        return $("ContextMenuButton",
            $(go.TextBlock, text),
            { click: action },
            // don't bother with binding GraphObject.visible if there's no predicate
            visiblePredicate ? new go.Binding("visible", "", function(o, e) { return o.diagram ? visiblePredicate(o, e) : false; }).ofObject() : {});
    }

    function makePort(name, spot, output, input) {
        // the port is basically just a small circle that has a white stroke when it is made visible
        return $(go.Shape, "Circle",
            {
                fill: null,
                stroke: null,  // this is changed to "white" in the showPorts function
                desiredSize: new go.Size(6, 6),
                alignment: spot, alignmentFocus: spot,  // align the port on the main Shape
                portId: name,  // declare this object to be a "port"
                fromSpot: spot, toSpot: spot,  // declare where links may connect at this port
                fromLinkable: output, toLinkable: input,  // declare whether the user may draw links to/from here
                cursor: "pointer",  // show a different cursor to indicate potential link point
                //margin: 1
            });
    }


    // Add a port to the specified side of the selected nodes.
    function addNode(type) {
        myDiagram.startTransaction("addNode");
        // STate by default
        var data = {category: "state", text: "state", color: "white" }
        if (type == NodeType.event)
        {
            data = {category: "event", text: "state", color: "white" }
        }
        else if (type == NodeType.action)
        {
            data = {category: "action", text: "state", color: "white" }
        }
        myDiagram.model.addNodeData(data);
        part = myDiagram.findPartForData(data);
        part.location = myDiagram.toolManager.contextMenuTool.mouseDownPoint;
        myDiagram.commitTransaction("addNode");
    }

    var statetemplate =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "Rectangle",
                    new go.Binding("fill", "color")),
                $(go.TextBlock,
                    { margin: 8,
                        font: "15px sans-serif",
                        editable: true},
                    new go.Binding("text", "text"))
            ),
            // four named ports, one on each side:
            makePort("T", go.Spot.Top, true, true),
            makePort("L", go.Spot.Left, true, true),
            makePort("R", go.Spot.Right, true, true),
            makePort("B", go.Spot.Bottom, true, true)
        );

    var eventtemplate =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "RoundedRectangle",
                    new go.Binding("fill", "color")),
                $(go.TextBlock,
                    { margin: 5,
                        font: "15px sans-serif",
                        editable: true},
                    new go.Binding("text", "text"))
            ),
            // four named ports, one on each side:
            makePort("T", go.Spot.Top, true, true),
            makePort("L", go.Spot.Left, true, true),
            makePort("R", go.Spot.Right, true, true),
            makePort("B", go.Spot.Bottom, true, true)
        );

    var actiontemplate =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "Ellipse",
                    new go.Binding("fill", "color")),
                $(go.TextBlock,
                    { margin: 5,
                        font: "15px sans-serif",
                        editable: true},
                    new go.Binding("text", "text"))
            ),
            // four named ports, one on each side:
            makePort("T", go.Spot.Top, true, true),
            makePort("L", go.Spot.Left, true, true),
            makePort("R", go.Spot.Right, true, true),
            makePort("B", go.Spot.Bottom, true, true)
        );

    var simulta_template =
        $(go.Node, "Auto", nodeStyle(),
            $(go.Shape, "RoundedRectangle",
                { fill: "white" }),
            $(go.Panel, "Vertical",
                $(go.Panel, "Vertical",
                    new go.Binding("itemArray", "items"),
                    {
                        itemTemplate:
                            $(go.Panel, "Auto",
                                { margin: 2 },
                                $(go.Shape, "RoundedRectangle",
                                    { fill: "white" }),
                                $(go.TextBlock,
                                    { margin: 5,
                                        font: "15px sans-serif",
                                        editable: true}, new go.Binding("text", ""))
                            )
                    }),
                $(go.Panel, "Horizontal",
                    $(go.Shape,
                        {
                            strokeWidth: 2,
                            stroke: "black",
                            name: "ButtonIcon",
                            figure: "MinusLine",
                            desiredSize: new go.Size(10, 10),
                            visible: true,
                        }, new go.Binding("visible", "visibility"), {
                            click: function(e, obj) {
                                e.diagram.startTransaction();
                                var node = obj.part;
                                removeEvent(node);
                                e.diagram.commitTransaction(""); } } ),
                    $(go.Shape,
                        {
                            strokeWidth: 2,
                            name: "ButtonIcon",
                            figure: "PlusLine",
                            desiredSize: new go.Size(10, 10)
                        },  {
                            click: function(e, obj) {
                                e.diagram.startTransaction();
                                var node = obj.part;
                                addEvent(node);
                                e.diagram.commitTransaction(""); } } )
                )
            ),
            // four named ports, one on each side:
            makePort("T", go.Spot.Top, true, true),
            makePort("L", go.Spot.Left, true, true),
            makePort("R", go.Spot.Right, true, true),
            makePort("B", go.Spot.Bottom, true, true)
        );

    function addEvent(node) {
        var size = node.data.items.length + 1;
        myDiagram.model.insertArrayItem(node.data.items, -1, "event " + size);
        node.diagram.model.setDataProperty(node.data, "visibility", true);
    }

    function removeEvent(node) {
        var size = node.data.items.length;
        if(size > 1)
        {
            myDiagram.model.removeArrayItem(node.data.items, size-1);
        }
        if (size <= 2)
        {
            node.diagram.model.setDataProperty(node.data, "visibility", false);
        }
    }

    var templmap = new go.Map("string", go.Node);
    // for each of the node categories, specify which template to use
    templmap.add("state", statetemplate);
    templmap.add("action", actiontemplate);
    templmap.add("event", eventtemplate);
    templmap.add("simu_event", simulta_template);
    myDiagram.nodeTemplateMap = templmap;


    function nodeInfo(d) {  // Tooltip info for a node data object
        var str = "Node " + d.key + ": " + d.text + "\n";
        if (d.group)
            str += "member of " + d.group;
        else
            str += "top-level node";
        return str;
    }

    // Define the appearance and behavior for Links:

    function linkInfo(d) {  // Tooltip info for a link data object
        return "Link:\nfrom " + d.from + " to " + d.to;
    }

    // The link shape and arrowhead have their stroke brush data bound to the "color" property
    myDiagram.linkTemplate =
        $(go.Link,
            { toShortLength: 3, relinkableFrom: true, relinkableTo: true },  // allow the user to relink existing links
            $(go.Shape,
                { strokeWidth: 1 },
                new go.Binding("stroke", "color")),
            $(go.Shape,
                { toArrow: "Standard", stroke: null },
                new go.Binding("fill", "color")),
            { // this tooltip Adornment is shared by all links
                toolTip:
                    $(go.Adornment, "Auto",
                        $(go.Shape, { fill: "#FFFFCC" })
                        /*$(go.TextBlock, { margin: 4 },  // the tooltip shows the result of calling linkInfo(data)
                         new go.Binding("text", "", linkInfo))*/
                    ),
                // the same context menu Adornment is shared by all links
                //contextMenu: partContextMenu
            }
        );

    // Define the appearance and behavior for Groups:

    function groupInfo(adornment) {  // takes the tooltip or context menu, not a group node data object
        var g = adornment.adornedPart;  // get the Group that the tooltip adorns
        var mems = g.memberParts.count;
        var links = 0;
        g.memberParts.each(function(part) {
            if (part instanceof go.Link) links++;
        });
        return "Group " + g.data.key + ": " + g.data.text + "\n" + mems + " members including " + links + " links";
    }
    // Define the behavior for the Diagram background:

    function diagramInfo(model) {  // Tooltip info for the diagram's model
        return "Model:\n" + model.nodeDataArray.length + " nodes, " + model.linkDataArray.length + " links";
    }

    // provide a tooltip for the background of the Diagram, when not over any Part
    myDiagram.toolTip =
        $(go.Adornment, "Auto",
            $(go.Shape, { fill: "#FFFFCC" }),
            $(go.TextBlock, { margin: 4 },
                new go.Binding("text", "", diagramInfo))
        );

    // provide a context menu for the background of the Diagram, when not over any Part
    myDiagram.contextMenu =
        $(go.Adornment, "Vertical",
            makeButton("Paste",
                function(e, obj) { e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint); },
                function(o) { return o.diagram.commandHandler.canPasteSelection(); }),
            makeButton("Undo",
                function(e, obj) { e.diagram.commandHandler.undo(); },
                function(o) { return o.diagram.commandHandler.canUndo(); }),
            makeButton("Redo",
                function(e, obj) { e.diagram.commandHandler.redo(); },
                function(o) { return o.diagram.commandHandler.canRedo(); }),
            makeButton("Add state",
                function(e, obj) { addNode(NodeType.state); },
                function(o) { return true; }),
            makeButton("Add action",
                function(e, obj) { addNode(NodeType.action); },
                function(o) { return true; }),
            makeButton("Add event",
                function(e, obj) { addNode(NodeType.event); },
                function(o) { return true; })
        );

    // Make all ports on a node visible when the mouse is over the node
    function showPorts(node, show) {
        var diagram = node.diagram;
        if (!diagram || diagram.isReadOnly || !diagram.allowLink) return;
        node.ports.each(function(port) {
            port.stroke = (show ? "black" : null);
        });
    }

    // Create the Diagram's Model:
    var nodeDataArray = [
        //{ category: "state", key: 1, text: "node1", color: "white" },
    ];
    var linkDataArray = [
    ];
    myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);


    // initialize the Palette that is on the left side of the page
    myPalette =
        $(go.Palette, "myPaletteDiv",  // must name or refer to the DIV HTML element
            {
                scrollsPageOnFocus: false,
                contentAlignment: go.Spot.Center,
                nodeTemplateMap: myDiagram.nodeTemplateMap,  // share the templates used by myDiagram
                model: new go.GraphLinksModel([  // specify the contents of the Palette
                    { category: "state", text: "state", color: "white" },
                    { category: "event", text: "event", color: "white" },
                    { category: "simu_event", items: [ "event 1", "event 2" ], color: "white" },
                    { category: "action", text: "action", color: "white" }
                ])
            });
}

function save_fcm()
{
    var modelAsText = myDiagram.model.toJson();
    var fcm_name = $("#fcm_name").val();
    add_fcm_in_list_ui(fcm_name);
    $("#fcm_name").val('');
    var text = modelAsText;
}

function generate_fcm_file()
{
    var modelAsText = myDiagram.model.toJson();
    //alert(modelAsText);
    var fcm_name = $("#fcm_name").val();
    save_new_fcm(fcm_name);
    /*var text = `
     package actuplan.fcms;

     import java.util.Arrays;
     import java.util.List;

     import fcm.CognitiveMap;
     import fcm.Concept;
     import fcm.ConceptActivator;
     import fcm.act.LinearActivator;
     import fcm.act.SignumActivator;
     import fcm.act.SignumActivator.Mode;
     import fcm.conn.WeightedConnection;

     public class ` + fcm_name + ` extends FcmInstance {

     public medivac_called(List<String> params)
     {
     super(params);

     map = new CognitiveMap("` + fcm_name + `");

     LinearActivator lin = new LinearActivator(0,1,0,1);

     ConceptActivator sig_pos = new SignumActivator(0);
     ((SignumActivator) sig_pos).setMode(Mode.BINARY);

     Concept total_victims = new Concept("total_victims", lin, true, true);
     total_victims.setValues(0,  1, Arrays.asList("false", "true"));
     map.addConcept(total_victims);

     Concept add_victim = new Concept("add_victim", sig_pos, false, false);
     add_victim.setValues(0,  1, Arrays.asList("false", "true"));
     add_victim.setHasNoPrecondition();
     map.addConcept(add_victim);

     Concept medivac_called = new Concept("medivac_called", lin, true, true);
     medivac_called.setValues(0,  1, Arrays.asList("false", "true"));
     map.addConcept(medivac_called);

     Concept medivac_arriving = new Concept("medivac_arriving", sig_pos, false, false);
     medivac_arriving.setValues(0,  1, Arrays.asList("false", "true"));
     map.addConcept(medivac_arriving);

     int delay = 1;
     map.addConnection(new WeightedConnection("total_victims -> add_victim", "", 1, 1));
     //map.addConnection(new WeightedConnection("difficulty -> add_victim", "", 1, 1));
     map.addConnection(new WeightedConnection("add_victim -> medivac_arriving", "", -1, 0));
     map.addConnection(new WeightedConnection("medivac_called -> medivac_arriving", "", 1, 1));

     runner.setMap(map);
     }
     }`*/
    return text;
}

function encode_fcm() {
    var fcm_txt = generate_fcm_file();
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fcm_txt));
    element.setAttribute('download', 'test.java');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
};

jQuery(function($){

    function add_fcm_in_list_ui(fcm_name) {
        var ul = document.getElementById("list_fcm");
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(fcm_name));
        li.setAttribute("class", "list-group-item d-flex justify-content-between align-items-center");
        li.setAttribute("style", "cursor:pointer");

        var button = document.createElement("button");
        button.setAttribute("type","button");
        button.setAttribute("class","close");
        button.setAttribute("aria-label","Close");
        button.onclick = function(event) {
            var r = confirm("Delete \"" + fcm_name + "\" ?");
            if (r == true) {
                $.ajax({
                    type: "POST",
                    url: "/del_fcm",
                    data: {
                        name_fcm: fcm_name
                    },
                    success: function(result) {
                        get_fcms();
                    },
                    error: function(result) {
                        // alert('error');
                    }
                });
            }
        };
        var span = document.createElement("span");
        span.setAttribute("aria-hidden","true");
        span.innerHTML = "&times;";
        button.appendChild(span);

        li.appendChild(button);
        li.onclick = function(event) {
            myDiagram.model = go.Model.fromJson(fcms[fcm_name]);
            $("#list_fcm li").each(function() {
                $(this).attr("class", "list-group-item d-flex justify-content-between align-items-center");
            });
            li.setAttribute("class", "list-group-item d-flex justify-content-between align-items-center active");
        };

        ul.appendChild(li);
    }

    document.getElementById("save_fcm").onclick = function(e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            url: "/save_fcm",
            data: {
                name_fcm: $("#fcm_name").val(),
                json_fcm: myDiagram.model.toJson()
            },
            success: function(result) {
                get_fcms();
            },
            error: function(result) {
                // alert('error');
            }
        });
    };

    function get_fcms() {
        $.ajax({
            type: "POST",
            url: "/get_fcms",
            data: {},
            success: function (result) {
                $("#list_fcm").empty();
                fcms = JSON.parse(result);
                for (var key in fcms) {
                    if (fcms.hasOwnProperty(key)) {
                        add_fcm_in_list_ui(key);
                    }
                }
            },
            error: function (result) {
                // alert('error');
            }
        });
    }
    get_fcms();
});