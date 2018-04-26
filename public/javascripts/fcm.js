var fcms = null;
var myDiagram = null;
var selected_li = null;

jQuery(function($) {

    function add_fcm_in_list_ui(fcm_name, add_before) {
        var ul = $("#list_fcm");
        var li = $("<li></li>");
        li.attr("class", "list-group-item d-flex justify-content-between align-items-center");
        li.attr("style", "cursor:pointer");
        var span_text = document.createElement("small");
        span_text.setAttribute("class", "text-muted");
        span_text.setAttribute("id", "fcm_txt");
        span_text.setAttribute("style", "max-width: 180px; word-wrap: break-word;");
        span_text.textContent = fcm_name;
        li.append(span_text);

        add_list_button(li, span_text);

        li.on("click",function() {
            // do not enter if the selected element was already selected or the click is on the input rename box
            if (selected_li == li || $("#target").is(":input")) return;

            if (fcms && fcm_name in fcms) {  myDiagram.model = go.Model.fromJson(fcms[fcm_name]); }
            else  { myDiagram.model = new go.GraphLinksModel(); }

            selected_li = li;
            $("#list_fcm li").each(function () {
                $(this).removeClass("active");
            });
            li.addClass("active");
            $("#list_fcm li").each(function () {
                $(this).find('#unsaved_label').css("visibility", "hidden");
            });
        });

        if (add_before) { ul.prepend(li);}
        else {ul.append(li);}

        return li;
    }

    function add_list_button(li_item, span_text) {
        var div = $("<div></div>");
        var oriVal, input;

        // Modification flag label
        var unsaved = document.createElement("small");
        unsaved.setAttribute("class", "text-muted");
        unsaved.setAttribute("style", "margin-right: 5px; visibility:hidden;");
        unsaved.setAttribute("id", "unsaved_label");
        unsaved.textContent = "(unsaved)";
        div.append(unsaved);

        // rename button
        var button_rename = $("<img></img>");
        button_rename.attr("src", "images/rename.png");
        button_rename.attr("style", "margin-top: -2.5px; margin-right: 3px;");
        button_rename.on("click",function() {
            event.stopImmediatePropagation();
            oriVal = span_text.textContent;
            input = $("<input type='text' value=\"" + oriVal + "\">");
            input.insertBefore(span_text).focus();
            span_text.remove();

            f = function(e) {
                if(e.keyCode && e.keyCode != 13) return;
                var $this = $(this);
                var new_val = $this.val();
                $this.remove();
                span_text.textContent = $this.val();
                li_item.prepend(span_text);
                if ($this.val() != oriVal) {
                    rename_fcm(oriVal, $this.val(), span_text);
                };
            }

            input.focusout(f);
            input.keyup(f);
        });
        div.append(button_rename);

        // Delete button
        var button_delete = $("<button></button>");
        button_delete.attr("type", "button");
        button_delete.attr("class", "close");
        button_delete.attr("aria-label", "Close");
        button_delete.attr("data-toggle", "confirm_del");
        button_delete.confirmation({
            rootSelector: '[data-toggle=confirmation]',
            title: 'Delete \"' + span_text.textContent + '\" ?',
            onConfirm: function() {
                button_delete.confirmation('hide');
                $.ajax({
                    type: "POST",
                    url: "/del_fcm",
                    data: {
                        name_fcm: span_text.textContent
                    },
                    success: function (result) {
                        li_item.remove();
                        myDiagram.model = new go.GraphLinksModel();
                    },
                    error: function (result) {
                        alert('Error while deleting the FCM');
                    }
                });
            },
            popout: true
        });

        var span = $("<span></span>");
        span.attr("aria-hidden", "true");
        span.html("&times;");
        button_delete.append(span);
        div.append(button_delete);

        li_item.append(div);
    }

    function rename_fcm(old, n, span_text) {
        $.ajax({
            type: "POST",
            url: "/rename_fcm",
            data: {
                old_name_fcm: old,
                new_name_fcm: n
            },
            success: function (result) {
                // get_fcms();
            },
            error: function (result) {
                span_text.textContent = old;
                alert(result.responseText);
            }
        });
    }

    function save_fcm(name) {
        $.ajax({
            type: "POST",
            url: "/save_fcm",
            data: {
                name_fcm: name,
                json_fcm: myDiagram.model.toJson()
            },
            success: function (result) {
                selected_li.find('#unsaved_label').css("visibility", "hidden");
                fcms[name] = myDiagram.model.toJson();
            },
            error: function (result) {
                alert(result.responseText);
            }
        });
    }

    document.getElementById("save_fcm").onclick = function (e) {
        e.preventDefault();
        save_fcm(selected_li.find('#fcm_txt').text());
    };

    function load_fcms() {

        $.ajax({
            type: "POST",
            url: "/get_fcms",
            data: {},
            success: function (result) {
                fcms = JSON.parse(result);
                for (var key in fcms) {
                    if (fcms.hasOwnProperty(key)) {
                        add_fcm_in_list_ui(key,false);
                    }
                }
                var li = add_fcm_in_list_ui(generate_default_fcm_name(),true);
                li.click();
                li.find('#unsaved_label').css("visibility", "visible");
            },
            error: function (result) {
                // alert('error');
            }
        });
    }

    function init_list_fcms() {
        load_fcms();
        document.getElementById("clickMe").onclick = function () {
            myDiagram.layoutDiagram(true); };
    }

    function generate_default_fcm_name()
    {
        var i = 2;
        var name = 'Untitled';
        while(name in fcms)
        {
            name = 'Untitled' + i.toString();
            i++;
        }
        return name;
    }

    function update_unsave_label()
    {
        if (selected_li) {
            selected_li.find('#unsaved_label').css("visibility", "visible");
        }
    }

function init_diagram() {

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
                "undoManager.isEnabled": true,
            });
    myDiagram.allowDrop = true;  // permit accepting drag-and-drops
    myDiagram.layout = $(go.LayeredDigraphLayout);
    myDiagram.layout.isInitial = false;
    myDiagram.layout.isOngoing = false;
    set_layout_options();
    // Define the appearance and behavior for Nodes:

    // First, define the shared context menu for all Nodes, Links, and Groups.

    myDiagram.addModelChangedListener(function digmModified(evt) {
        if (!evt.isTransactionFinished) return;
        var txn = evt.object;  // a Transaction
        if (txn === null || evt.object.name == "Transaction" || evt.object.name == "Initial Layout") return;
        update_unsave_label();
    });

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
            },
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

    var partContextMenu =
        $(go.Adornment, "Vertical",
            makeButton("Add difficulty",
                function(e, obj) {
                   var contextmenu = obj.part;  // the Button is in the context menu Adornment
                    var part = contextmenu.adornedPart;  // the adornedPart is the Part that the context menu adorns
                    myDiagram.model.setDataProperty(part.data, "difficulty", part.data.difficulty+"+");
                },
                function(o) { return true; }),
            makeButton("Remove difficulty",
                function(e, obj) {
                    var contextmenu = obj.part;  // the Button is in the context menu Adornment
                    var part = contextmenu.adornedPart;  // the adornedPart is the Part that the context menu adorns
                    var new_str = part.data.difficulty.substr(0,part.data.difficulty.length-1);
                    myDiagram.model.setDataProperty(part.data, "difficulty", new_str);
                },
                function(obj) {
                    var contextmenu = obj.part;  // the Button is in the context menu Adornment
                    var part = contextmenu.adornedPart;  // the adornedPart is the Part that the context menu adorns
                    return part.data.difficulty.length > 0;
                })
        );

    var cpt_template =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "Diamond", {geometryStretch: go.GraphObject.Uniform},
                    new go.Binding("fill", "color")),
                $(go.TextBlock,
                    { margin: 2,
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

    var hnt_template =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "TriangleUp",
                    new go.Binding("fill", "color")),
                $(go.TextBlock,
                    { margin: 3,
                        font: "15px sans-serif",
                        editable: true},
                    new go.Binding("text", "text"))
            ),
            // four named ports, one on each side:
            makePort("T", go.Spot.Top, true, true),
            makePort("L", go.Spot.BottomLeft, true, true),
            makePort("R", go.Spot.BottomRight, true, true),
            makePort("B", go.Spot.Bottom, true, true)
        );

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
                $(go.Panel, "Horizontal",
                    $(go.TextBlock,
                        { margin: 5,
                            font: "15px sans-serif",
                            editable: true},
                        new go.Binding("text", "text")),
                    $(go.TextBlock,
                        {   margin: new go.Margin(4, 0, 0, 0),
                            font: "bold 15px sans-serif",
                            stroke: "red",
                            editable: false},
                        new go.Binding("text", "difficulty"),
                        new go.Binding("visible", "difficulty", function(v) { return v != ""; })))
            ),
            {
                contextMenu: partContextMenu
            },
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
    templmap.add("hnt", hnt_template);
    templmap.add("cpt", cpt_template);
    myDiagram.nodeTemplateMap = templmap;


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
                function(o) { return o.diagram.commandHandler.canRedo(); })
            /*makeButton("Add state",
                function(e, obj) { addNode(NodeType.state); },
                function(o) { return true; }),
            makeButton("Add action",
                function(e, obj) { addNode(NodeType.action); },
                function(o) { return true; }),
            makeButton("Add event",
                function(e, obj) { addNode(NodeType.event); },
                function(o) { return true; })*/
        );


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
                    { category: "event", text: "event", color: "white", difficulty: "" },
                    { category: "simu_event", items: [ "event 1", "event 2" ], color: "white" },
                    { category: "action", text: "action", color: "white" },
                    { category: "cpt", text: "cpt", color: "white" },
                    { category: "hnt", text: "hnt", color: "white" }
                ])
            });


       /* var eventtemplate2 = eventtemplate.copy();

        eventtemplate.selectionAdornmentTemplate =
            $(go.Adornment, "Spot",
                $(go.Panel, "Auto",
                    $(go.Shape, "Rectangle", { stroke: "dodgerblue", strokeWidth: 2, fill: null }),
                    $(go.Placeholder)  // a Placeholder sizes itself to the selected Node
                ),
                // the button to create a "next" node, at the top-right corner
                $("Button",
                    {
                        alignment: go.Spot.TopRight,
                        click: update_criteria  // this function is defined below
                    },
                    $(go.Shape, "PlusLine", { width: 6, height: 6 })
                ) // end button
            ); // end Adornment*/

        var templmap2 = templmap.copy();
        //templmap2.add("event", eventtemplate2);
        myPalette.nodeTemplateMap = templmap2;

        function update_criteria()
        {
            alert(2);
        }
    }


    function set_layout_options() {
        var lay = myDiagram.layout;

        lay.direction = 0;
        lay.layerSpacing = 60;
        lay.columnSpacing = 40;

        //lay.cycleRemoveOption = go.LayeredDigraphLayout.CycleDepthFirst;

        lay.layeringOption = go.LayeredDigraphLayout.LayerLongestPathSource;
        lay.initializeOption = go.LayeredDigraphLayout.InitNaive;
        lay.aggressiveOption = go.LayeredDigraphLayout.AggressiveLess;
        lay.packOption = go.LayeredDigraphLayout.PackMedian;

        lay.setsPortSpots = true;
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

    init_diagram();
    init_list_fcms();
});
