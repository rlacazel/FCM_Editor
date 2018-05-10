var fcms = null;
var myDiagram = null;
var selected_li = null;
var redraw_required = false;
var predicates_table = null;
var right_clicked_data = null;

jQuery(function($) {

    predicates_table = $("#edittable").editTable({
        data: [
            ['']
        ],
        headerCols: [
            'Predicates'
        ],
        //maxRows: 3
    });

    function add_fcm_in_list_ui(fcm_name, add_before) {
        var ul = $("#list_fcm");
        var li = $("<li></li>");
        li.attr("class", "list-group-item d-flex justify-content-between align-items-center rounded-0");
        li.attr("style", "cursor:pointer; margin-right: -21px; margin-left: -21px");
        var span_text = document.createElement("small");
        span_text.setAttribute("class", "text-muted");
        span_text.setAttribute("id", "fcm_txt");
        span_text.setAttribute("style", "max-width: 230px; word-wrap: break-word;");
        span_text.textContent = fcm_name;
        li.append(span_text);

        add_list_button(li, span_text);

        li.on("click",function() {
            // do not enter if the selected element was already selected or the click is on the input rename box
            if (selected_li == li || $("#target").is(":input")) return;

            if (fcms && span_text.textContent in fcms) {  myDiagram.model = go.Model.fromJson(fcms[span_text.textContent]); }
            else  { myDiagram.model = new go.GraphLinksModel();
                    myDiagram.model.copiesArrays = true;
                    myDiagram.model.copiesArrayObjects = true; }

            selected_li = li;
            $("#list_fcm li").each(function () {
                $(this).removeClass("active");
            });
            li.addClass("active");
            $("#list_fcm li").each(function () {
                $(this).find('#unsaved_label').css("visibility", "hidden");
            });

            // update worldstate
            update_world_state();
        });

        if (add_before) { ul.prepend(li);}
        else {ul.append(li);}

        return li;
    }

    function get_all_fcm_name_on_screen()
    {
        var fcms_name = [];
        $("#list_fcm li").each(function () {
            fcms_name.push($(this).find('#fcm_txt').text());
        });
        return fcms_name;
    }

    function update_world_state()
    {
        var state_container = $("#world_state");
        state_container.empty();
        $("#list_fcm_res").empty();
        for(var node_id in myDiagram.model.nodeDataArray)
        {
            if(myDiagram.model.nodeDataArray[node_id].category == "state")
            {
                var name = myDiagram.model.nodeDataArray[node_id].text;
                var key = myDiagram.model.nodeDataArray[node_id].key;

                var div = $("<div></div>");
                div.attr("class", "form-check");

                var label = $("<label></label>");
                div.append(label);

                var input = $("<input></input>");
                input.attr("type", "checkbox");
                input.attr("id", key);

                var span = $("<span></span>");
                span.attr("class", "label-text");
                span.html(name);

                label.append(input);
                label.append(span);

                state_container.append(div);
            }
        }
    }

    function add_list_button(li_item, span_text) {
        var div = $("<div></div>");
        var oriVal, input;

        // Modification flag label
        var unsaved = $("<small></small>");
        unsaved.attr("class", "text-muted");
        unsaved.attr("style", "margin-right: 5px; visibility:hidden;");
        unsaved.attr("id", "unsaved_label");
        unsaved.html("(unsaved)");
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

    function execute_fcm(fcm_name, params) {
        $.ajax({
            type: "POST",
            url: "/execute_fcm",
            data: {
                fcm_name: fcm_name,
                input_params: JSON.stringify(params),
            },
            success: function (result) {
                var list = $("#list_fcm_res");
                list.empty();
                var json_alter = JSON.parse(result)
                for (var id in json_alter) {
                    var name = json_alter[id].name;
                    var keys = json_alter[id].keys;

                    var li = $("<li></li>");
                    li.hover(function() {
                        $(this).attr("style", "cursor:pointer");
                    });
                    li.attr("id",JSON.stringify(keys));
                    li.text(name);
                    li.on("click", function(){
                        var keys = JSON.parse(this.id);
                        color_path(keys);
                    });
                    list.append(li);
                }
            },
            error: function (result) {
                //
            }
        });
    }

    function color_path(keys)
    {
        myDiagram.startTransaction("change color");
        for(var node_id in myDiagram.model.nodeDataArray)
        {
            if ($.inArray(myDiagram.model.nodeDataArray[node_id].key,keys) >= 0)
            {
                myDiagram.model.setDataProperty(myDiagram.model.nodeDataArray[node_id], "color", "green");
                myDiagram.model.setDataProperty(myDiagram.model.nodeDataArray[node_id], "strokeWidth", 2);
            }
            else
            {
                myDiagram.model.setDataProperty(myDiagram.model.nodeDataArray[node_id], "color", "black");
                myDiagram.model.setDataProperty(myDiagram.model.nodeDataArray[node_id], "strokeWidth", 1);
            }
        }
        for(var link_id in myDiagram.model.linkDataArray)
        {
            if ($.inArray(myDiagram.model.linkDataArray[link_id].from, keys) >= 0 && $.inArray(myDiagram.model.linkDataArray[link_id].to, keys) >= 0)
            {
                myDiagram.model.setDataProperty(myDiagram.model.linkDataArray[link_id], "color", "green");
                myDiagram.model.setDataProperty(myDiagram.model.linkDataArray[link_id], "strokeWidth", 2);
            }
            else
            {
                myDiagram.model.setDataProperty(myDiagram.model.linkDataArray[link_id], "color", "black");
                myDiagram.model.setDataProperty(myDiagram.model.linkDataArray[link_id], "strokeWidth", 1);
            }
        }
        myDiagram.commitTransaction("change color");
    }

    function save_fcm(name) {
        // do not save green path
        color_path({});
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

    document.getElementById("new_fcm").onclick = function (e) {
        e.preventDefault();
        var li = add_fcm_in_list_ui(generate_default_fcm_name(),true);
        li.click();
        li.find('#unsaved_label').css("visibility", "visible");
    };

    $("#download").click(function() {
        $.ajax({
            type: "POST",
            url: "/get_fcms",
            data: {},
            success: function (result) {
                var fcms_db = JSON.parse(result);
                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result));
                element.setAttribute('download', 'fcms.json');

                element.style.display = 'none';
                document.body.appendChild(element);

                element.click();

                document.body.removeChild(element);
            },
            error: function (result) {
                // alert('error');
            }
        });

    });

    $("#run_fcm").click(function() {
        var params = {};
        var inputs = $("#world_state :input");
        for(var input_id in inputs)
        {
            if(inputs[input_id].checked)
            {
                params[inputs[input_id].id] = 1;
            }
        }
        execute_fcm(selected_li.find('#fcm_txt').text(), params);
    });

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
        document.getElementById("layout").onclick = function () {
            myDiagram.layoutDiagram(true);
            redraw_required = true;
        };
        document.getElementById("load_world_state").onclick = function () {
            update_world_state();
        };
        document.getElementById("validate_properties").onclick = function () {
            if (right_clicked_data) {
                var type_io = '';
                $('#inputoutput .active').each(function () {
                    type_io = $(this).attr('id');
                });
                var predicates = predicates_table.getJsonData();
                myDiagram.model.setDataProperty(right_clicked_data, "type_io", type_io);
                myDiagram.model.setDataProperty(right_clicked_data, "predicates", predicates);
                update_unsave_label();
                right_clicked_data = null;
            }
            $('#NodeProperty').modal('hide');
        };
    }

    function generate_default_fcm_name()
    {
        var i = 2;
        var fcms_name = get_all_fcm_name_on_screen();
        var name = 'Untitled';
        while(name in fcms || $.inArray(name, fcms_name) >= 0)
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
    var $j = jQuery.noConflict();
    var NodeType = {"state":1, "event":2, "action":3, "comment":4};

    myDiagram =
        $(go.Diagram, "myDiagramDiv",  // create a Diagram for the DIV HTML element
            {
                // position the graph in the middle of the diagram
                initialContentAlignment: go.Spot.Center,

                // allow double-click in background to create a new node
                "clickCreatingTool.archetypeNodeData": { text: "Node", color: "white" },

                // enable undo & redo
                "undoManager.isEnabled": true,
            });
    myDiagram.allowDrop = true;  // permit accepting drag-and-drops
    myDiagram.layout = $(go.LayeredDigraphLayout);
    myDiagram.layout.isInitial = false;
    myDiagram.layout.isOngoing = false;
   // myDiagram.layout.isRouting = false;

    set_layout_options();
    // Define the appearance and behavior for Nodes:

    // First, define the shared context menu for all Nodes, Links, and Groups.

    myDiagram.addModelChangedListener(function digmModified(evt) {
        if (!evt.isTransactionFinished) return;
        var txn = evt.object;  // a Transaction
        if (txn === null || evt.object.name == "Transaction" || evt.object.name == "Initial Layout") return;
        update_unsave_label();
    });

    myDiagram.addDiagramListener("AnimationFinished", function (evt) {
        if (redraw_required) {
            myDiagram.startTransaction("Relink");
            var links = myDiagram.model.linkDataArray;
            var tmp_links = [];
            for (var lnk in links) {
                tmp_links.push(links[lnk]);
            }
            for(var ll in tmp_links)
            {
                myDiagram.model.removeLinkData(tmp_links[ll]);
            }
            for(var ll in tmp_links)
            {
                myDiagram.model.addLinkData(tmp_links[ll]);
            }
            myDiagram.commitTransaction("Relink");
        }
    });

    // -----------------------------
    // ---- Manage copy / paste -----
    // -----------------------------
    function DrawCommandHandler() {
        go.CommandHandler.call(this);
        this._arrowKeyBehavior = "move";
        this._pasteOffset = new go.Point(10, 10);
        this._lastPasteOffset = new go.Point(0, 0);
    }
    go.Diagram.inherit(DrawCommandHandler, go.CommandHandler);

    myDiagram.commandHandler = new DrawCommandHandler();

    Object.defineProperty(DrawCommandHandler.prototype, "pasteOffset", {
        get: function() { return this._pasteOffset; },
        set: function(val) {
            if (!(val instanceof go.Point)) throw new Error("DrawCommandHandler.pasteOffset must be a Point, not: " + val);
            this._pasteOffset.set(val);
        }
    });

    DrawCommandHandler.prototype.copyToClipboard = function(coll) {
        go.CommandHandler.prototype.copyToClipboard.call(this, coll);
        this._lastPasteOffset.set(this.pasteOffset);
    };

    DrawCommandHandler.prototype.pasteFromClipboard = function() {
        var coll = go.CommandHandler.prototype.pasteFromClipboard.call(this);
        this.diagram.moveParts(coll, this._lastPasteOffset);
        this._lastPasteOffset.add(this.pasteOffset);
        return coll;
    };
    // -----------------------------
    // ---- End copy / paste --------
    // -----------------------------

    myDiagram.commandHandler.doKeyDown = function() {
        var e = myDiagram.lastInput;
        // The meta (Command) key substitutes for "control" for Mac commands
        var control = e.control || e.meta;
        var key = e.key;
        // Quit on any undo/redo key combination:
        if (control && key === 'S') {
            save_fcm(selected_li.find('#fcm_txt').text());
        }
        else {
            // call base method with no arguments (default functionality)
            go.CommandHandler.prototype.doKeyDown.call(this);
        }
    };

    function nodeStyle() {
        return [
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            {
                locationSpot: go.Spot.Center,
                // handle mouse enter/leave events to show/hide the ports
               // mouseEnter: function (e, obj) { showSmallPorts(obj.part, true); },
               // mouseLeave: function (e, obj) { showSmallPorts(obj.part, false); }
            },
            new go.Binding("isShadowed", "isSelected").ofObject(),
            {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue"
            }
    ];
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
       /* else if (type == NodeType.comment)
        {
            data = {key: "A comment", text: "comment\nabout Alpha", category: "Comment"};
            myDiagram.model.addLinkData({from: "A comment", to:-1, category: "Comment"});
        }*/
        myDiagram.model.addNodeData(data);
        part = myDiagram.findPartForData(data);
        part.location = myDiagram.toolManager.contextMenuTool.mouseDownPoint;
        myDiagram.commitTransaction("addNode");
    }

    var partContextMenu =
        $(go.Adornment, "Vertical",
            makeButton("Add difficulty",
                function(e, obj) {
                   var part = obj.part;  // the Button is in the context menu Adornment
                    myDiagram.model.setDataProperty(part.data, "difficulty", part.data.difficulty+"+");
                },
                function(obj) { return !obj.part.data.category || obj.part.data.category == "event" || obj.part.data.category == "simu_event"; }),
            makeButton("Remove difficulty",
                function(e, obj) {
                    var part = obj.part;  // the Button is in the context menu Adornment
                    var new_str = part.data.difficulty.substr(0,part.data.difficulty.length-1);
                    myDiagram.model.setDataProperty(part.data, "difficulty", new_str);
                },
                function(obj) {
                    var part = obj.part;  // the Button is in the context menu Adornment
                    return (!obj.part.data.category || obj.part.data.category == "event" || obj.part.data.category == "simu_event") && part.data.difficulty.length > 0;
                }),
            makeButton("Properties",
                function(e, obj) {
                    right_clicked_data = obj.part.data;
                    fill_and_display_property_modal(right_clicked_data);
                },
                function(o) { return true; })
        );

    function fill_and_display_property_modal(data)
    {
        $j('#properties_label').html(data.text);
        // Load input output button
        $j('#inputoutput label').each(function(){
            if(data.type_io) {
                if ($j(this).attr('id') == data.type_io) {
                    $j(this).addClass("active");
                }
                else {
                    $j(this).removeClass("active");
                }
            }
        });
        // Load predicates
        if (data.predicates) {
            var predicates = data.predicates;
            var data = [predicates];
            predicates_table.loadJsonData(predicates);
        }
        $j('#NodeProperty').modal('show');
    }

    var partContextMenuForLink =
        $(go.Adornment, "Vertical",
            makeButton("Negative link",
                function(e, obj) {
                    var contextmenu = obj.part;
                    var part = contextmenu.adornedPart;
                    myDiagram.model.setDataProperty(part.data, "label", "not");
                    myDiagram.model.setDataProperty(part.data, "visible", true);
                },
                function(obj) {
                    var contextmenu = obj.part;
                    var part = contextmenu.adornedPart;
                    return !part.data.label || part.data.label == "";
            }),
            makeButton("Positive link",
                function(e, obj) {
                    var contextmenu = obj.part;
                    var part = contextmenu.adornedPart;
                    myDiagram.model.setDataProperty(part.data, "label", "");
                    myDiagram.model.setDataProperty(part.data, "visible", false);
                },
                function(obj) {
                    var contextmenu = obj.part;
                    var part = contextmenu.adornedPart;
                    return part.data.label == "not";
                })
        );

    var cpt_template =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "Diamond", {geometryStretch: go.GraphObject.Uniform, portId: "",
                        fromLinkable: true,
                        toLinkable: true,
                        fill: "white"},
                    new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
                $(go.TextBlock,
                    { margin: 2,
                        font: "15px sans-serif",
                        editable: true, width: 120, wrap: go.TextBlock.WrapFit, textAlign: "center", isMultiline: false},
                    new go.Binding("text", "text").makeTwoWay())
            )
        );

    var hnt_template =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "TriangleUp",
                    {portId: "",
                        fromLinkable: true,
                        toLinkable: true,
                        fill: "white"},
                    new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
                $(go.TextBlock,
                    { margin: 3,
                        font: "15px sans-serif",
                        editable: true, width: 120, wrap: go.TextBlock.WrapFit, textAlign: "center", isMultiline: false},
                    new go.Binding("text", "text").makeTwoWay())
            )
        );


    var or_template =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Shape, "OrGate", {
                fill: "white",
                stroke: "darkslategray",
                desiredSize: new go.Size(30, 30),
                portId: "",
                fromLinkable: true,
                toLinkable: true
            }, new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
            $(go.TextBlock, {text:"or"})
        );


    var statetemplate =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "Ellipse",
                    {portId: "",
                    fromLinkable: true,
                    fromSpot: go.Spot.None,
                    toSpot: go.Spot.None,
                    toLinkable: true, fill: "white",
                        minSize: new go.Size(0, 38)},
                    new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
                $(go.TextBlock,
                    { margin: 2,
                        font: "15px sans-serif",
                        editable: true, width: 125, wrap: go.TextBlock.WrapFit, textAlign: "center", isMultiline: false},
                    new go.Binding("text", "text").makeTwoWay())
            ),
            {
                contextMenu: partContextMenu
            }
        );

    var eventtemplate =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "RoundedRectangle",
                    {portId: "",
                        fromLinkable: true,
                        toLinkable: true,
                        fill: "white"},
                    new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
                $(go.Panel, "Horizontal",
                    $(go.TextBlock,
                        { margin: 5,
                            font: "15px sans-serif",
                            editable: true, width: 120, wrap: go.TextBlock.WrapFit, textAlign: "center", isMultiline: false},
                        new go.Binding("text", "text").makeTwoWay()),
                    $(go.TextBlock,
                        {   margin: new go.Margin(4, 4, 0, 0),
                            font: "bold 15px sans-serif",
                            stroke: "red",
                            editable: false},
                        new go.Binding("text", "difficulty"),
                        new go.Binding("visible", "difficulty", function(v) { return v != ""; })))
            ),
            {
                contextMenu: partContextMenu
            }
        );


    var actiontemplate =
        $(go.Node, "Spot", nodeStyle(),
            $(go.Panel, "Auto",
                $(go.Shape, "Rectangle",
                    {portId: "",
                        fromLinkable: true,
                        toLinkable: true,
                        fill: "white"},
                    new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
                $(go.TextBlock,
                    { margin: 7,
                        font: "15px sans-serif",
                        editable: true, width: 110, wrap: go.TextBlock.WrapFit, textAlign: "center", isMultiline: false},
                    new go.Binding("text", "text").makeTwoWay())
            ),
            {
                contextMenu: partContextMenu
            }
        );

    var simulta_template =
        $(go.Node, "Auto", nodeStyle(),
            $(go.Shape, "RoundedRectangle",
                { fill: "white", portId: "",
                    fromLinkable: true,
                    toLinkable: true },
                new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
            $(go.Panel, "Vertical",
                $(go.Panel, "Vertical",
                    new go.Binding("itemArray", "items"),
                    {
                        itemTemplate:
                            $(go.Panel, "Auto",
                                { margin: 2, contextMenu: partContextMenu},
                                $(go.Shape, "RoundedRectangle",
                                    { fill: "white" }),
                                $(go.Panel, "Horizontal",
                                    $(go.TextBlock,
                                        { margin: 5,
                                            font: "15px sans-serif",
                                            editable: true, width: 180, wrap: go.TextBlock.WrapFit, textAlign: "center", isMultiline: false},
                                        new go.Binding("text", "text").makeTwoWay()),
                                    $(go.TextBlock,
                                        {   margin: new go.Margin(4, 4, 0, 0),
                                            font: "bold 15px sans-serif",
                                            stroke: "red",
                                            editable: false},
                                        new go.Binding("text", "difficulty"),
                                        new go.Binding("visible", "difficulty", function(v) { return v != ""; }))
                                )
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
            )
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
    templmap.add("or", or_template);
    myDiagram.nodeTemplateMap = templmap;
    myDiagram.nodeTemplateMap.add("Comment",
        $(go.Node,  // this needs to act as a rectangular shape for BalloonLink,
            { background: "transparent" },  // which can be accomplished by setting the background.
            $(go.TextBlock,
                { stroke: "brown", margin: 3 },
                new go.Binding("text"))
        ));

    myDiagram.linkTemplateMap.add("Comment",
        // if the BalloonLink class has been loaded from the Extensions directory, use it
        $((typeof BalloonLink === "function" ? BalloonLink : go.Link),
            $(go.Shape,  // the Shape.geometry will be computed to surround the comment node and
                // point all the way to the commented node
                { stroke: "brown", strokeWidth: 1, fill: "lightyellow" })
        ));


    // The link shape and arrowhead have their stroke brush data bound to the "color" property
    myDiagram.linkTemplate =
        $(go.Link,
            {
                relinkableFrom: true,
                relinkableTo: true,
                fromPortId: "",
                toPortId: "",
                selectionAdorned: false, // Links are not adorned when selected so that their color remains visible.
                shadowOffset: new go.Point(0, 0), shadowBlur: 5, shadowColor: "blue",
            },
            new go.Binding("isShadowed", "isSelected").ofObject(),
            $(go.Shape,
                new go.Binding("stroke", "color"), new go.Binding("strokeWidth", "strokeWidth")),
            $(go.Shape,
                { toArrow: "Standard", stroke: null },
                new go.Binding("fill", "color")),
            $(go.Panel, "Auto",
                $(go.Shape,  // the label background, which becomes transparent around the edges
                    {
                        fill: $(go.Brush, "Radial",
                            { 0: "rgb(240, 240, 240)", 0.3: "rgb(240, 240, 240)", 1: "rgba(240, 240, 240, 0)" }),
                        stroke: null,
                        visible: false
                    },
                    new go.Binding("visible", "visible")),
                $(go.TextBlock, "",  // the label text
                    {
                        textAlign: "center",
                        font: "10pt helvetica, arial, sans-serif",
                        margin: 8
                    },
                    new go.Binding("text", "label")
            )),
            {
                contextMenu: partContextMenuForLink
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
                    { category: "state", text: "state", color: "black" },
                    { category: "event", text: "event", color: "black", difficulty: "" },
                    { category: "simu_event", items: [ {text: "event 1", difficulty: ""}, {text: "event 2", difficulty: ""} ], color: "black" },
                    { category: "action", text: "action", color: "black" },
                    { category: "cpt", text: "cpt", color: "black" },
                    { category: "hnt", text: "hnt", color: "black" },
                    { category: "or", color: "black" }
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
    }


    function set_layout_options() {
        var lay = myDiagram.layout;
        lay.setsPortSpot = false;
        lay.setsChildPortSpot = false;
        lay.direction = 0;
        lay.layerSpacing = 50;
        lay.columnSpacing = 40;

        //lay.cycleRemoveOption = go.LayeredDigraphLayout.CycleDepthFirst;

        lay.layeringOption = go.LayeredDigraphLayout.LayerLongestPathSource;
        lay.initializeOption = go.LayeredDigraphLayout.InitNaive;
        lay.aggressiveOption = go.LayeredDigraphLayout.AggressiveLess;
        lay.packOption = go.LayeredDigraphLayout.PackMedian;
    }


    init_diagram();
    init_list_fcms();
});
