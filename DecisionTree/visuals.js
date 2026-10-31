// D3 owns only the SVG contents inside the containers supplied by React.
export function createTreeRenderer(container, onNodeClick) {
const d3 = window.d3;
let treeData;

		var height;
		var width;
		var root;
		var tree;
		var treeHeir;
		var svg;
		var i;
		var rtn = {
		    Tree: function () { return tree; },
            SVG: function() { return this.svg;  },
		    SetupD3 : function()
			{
				var margin = {top: 20, right: 120, bottom: 20, left: 120}
				this.width = 1024 - margin.right - margin.left,
				this.height = 800 - margin.top - margin.bottom;

				this.svg = d3.select(container).append("svg")
                    .attr("version", 1.1)
		            .attr("xmlns", "http://www.w3.org/2000/svg")
			        .attr("width", this.width + margin.right + margin.left)
			        .attr("height", this.height + margin.top + margin.bottom)
                    .append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
			},

			SetupTree : function(){
				this.treeHeir=null;
				this.tree = this.TreeStyle(treeData[0].TreeStyle)
					.size([this.height, this.width]);
					//.separation(function(){return 2;});

				this.root = treeData[0];

				this.i=this.root.maxId||0;
				this.root.maxId=this.i;

			},

			TypeToShape : function(type)
			{
				switch(type)
				{
					case "e":
						return "symbolTriangle";
					case "d":
						return "symbolSquare";
					case "c":
						return "symbolCircle";
				}
			},

			TypeToColour : function(type)
			{
				switch(type)
				{
					case "e":
						return "green";
					case "d":
						return "red";
					case "c":
						return "orange";
				}
			},

			AngleElbow : function (d)
			{
				return "M" + (d.source.y+10) + "," + d.source.x
				+ "L" + (d.source.y+50)+","+d.target.x + "H" + d.target.y;
			},

			SquareElbow : function (d)
			{
				return "M" + d.source.y + "," + d.source.x
				+ "V" + d.target.x+"H" + d.target.y;
			},

			Curve : function (d)
			{
				return d3.linkHorizontal()
				.x(function(d){
					return d.x;
				})
				.y(function(d){
					return d.y;
				});
			},

			TreeStyle:function(style)
			{
				switch(style)
				{
					case "tree":
						return d3.tree();
					case "cluster":
						return d3.cluster();
				}
			},

			LineStyle:function(style)
			{
				switch(style)
				{
					case "a":
						return this.AngleElbow;
					case "s":
						return this.SquareElbow;
					case "c":
						return d3.linkHorizontal()
						.x(function(d){
							return d.y;
						})
						.y(function(d){
							return d.x;
						});;
				}
			},

			RenderTree : function(parent) {
				var self = this;
				var analysis = DecisionAnalysis.analyze(treeData[0]);
				var marks = DecisionAnalysis.recommendations(treeData[0], analysis);


				// Compute the new tree layout.
				self.treeHeir=self.treeHeir||d3.hierarchy(self.root);
				self.treelayout=self.tree(self.treeHeir);
				const nodes = self.treelayout.descendants();
				const links = self.treelayout.links();
				//treeData=self.treeHeir;

				self.tree.nodes=nodes;
				self.tree.links=links;

				if(self.root.TreeStyle=="tree"){
					// Normalize for fixed-depth.
					nodes.forEach(function(d) { d.y = d.depth * (self.demoLayout ? 210 : 120); });
				}

				// Declare the nodes
			    var select = self.svg.selectAll("g.node");
				var node = select.data(nodes, function(d)
						{
							return d.data.identifier;
						});

				// Enter the nodes.
				var nodeEnter = node.enter().append("g")
				.attr("class", "node")
				.attr("transform", function(d) {
					return "translate(" + d.y + "," + d.x + ")"; }
				);

				nodeEnter.append('path')
				.attr("d", function(d)
				{
					return d3.symbol().size(300).type(d3[self.TypeToShape(d.data.Type)])();
				})
				.attr("transform", function(d) {
				    var transform = "translate(" + 2 + "," + -1 + ")";
					if (d.data.Type==="e")
					{
						transform = transform+" rotate(30)";
					}
					return transform;
				})
				.style("fill", function(d){
					return self.TypeToColour(d.data.Type);
				});

				nodeEnter.append("text")
				   .attr("class","name")
				   .attr("x", "-10")
				   .attr("y", "-10")
				   .attr("dy", ".35em")
				   .attr("text-anchor", "end")
				   .text(function (d) { return d.data.name; })
                   .style("font", "12px sans-serif")
				   .style("fill-opacity", 1);

				nodeEnter.append("text")
				   .attr("class","prob")
				   .attr("x", function(d) { return d.data.Type == "e" ? "15" : "-20"; })
				   .attr("y", function(d) { return d.data.Type == "e" ? "10" : "30"; })
				   .attr("dy", ".35em")
				   .attr("text-anchor", function (d) { return d.data.Type == "e" ? "start" : "end"; })
				   .text(function(d) { return d.data.Probability; })
				   .style("fill-opacity", 1)
                   .style("font", "12px sans-serif")
				   .style("fill","green");


				nodeEnter.append("text")
				   .attr("class","expval")
				   .attr("x", function(d) { return d.data.Type == "e" ? "15" : "-20"; })
				   .attr("y", function(d) { return d.data.Type == "e" ? "-5" : "15"; })
				   .attr("dy", ".35em")
				   .attr("text-anchor", function(d) { return d.data.Type == "e" ? "start" : "end"; })
				   .text(function (d) { return d.data.ExpVal == null ? 'Incomplete' : d.data.ExpVal; })
                   .style("font", "12px sans-serif")
				   .style("fill-opacity", 1);


				nodeEnter.on('click', function(event, d) { onNodeClick(d.data.identifier); });

				node.select("path")
				.attr("d", function(d)
				{
					return d3.symbol().size(300).type(d3[self.TypeToShape(d.data.Type)])();
				})
				.attr("transform", function(d) {
				    var transform = "translate(" + 2 + "," + -1 + ")";
					if (d.data.Type==="e")
					{
						transform = transform+" rotate(30)";
					}
					return transform;
				})
				.style("fill", function(d){
					return self.TypeToColour(d.data.Type);
				});

				var nodeUpdate = node;

				nodeUpdate.attr("transform", function(d) {
				return "translate(" + d.y + "," + d.x + ")"; });

				nodeUpdate.select(".name")
						  .text(function(d) { return d.data.name; })
						  .style("fill-opacity", 1);

			    nodeUpdate.select(".prob")
                          .attr("x", function (d) { return d.data.Type == "e" ? "15" : "-20"; })
				          .attr("y", function (d) { return d.data.Type == "e" ? "10" : "30"; })
						  .text(function (d) { return d.data.Probability; })
						  .style("fill-opacity", 1);

			    nodeUpdate.select(".expval")
                          .attr("x", function (d) { return d.data.Type == "e" ? "15" : "-20"; })
				          .attr("y", function (d) { return d.data.Type == "e" ? "-5" : "15"; })
						  .text(function (d) { return d.data.ExpVal == null ? 'Incomplete' : d.data.ExpVal; })
						  .style("fill-opacity", 1);

				node.exit().remove();

				// Declare the links
				var link = self.svg.selectAll("path.link")
				.data(links, function(d) { return d.target.data.identifier; });

				// Enter the links.
			    link.enter().insert("path", "g")
			        .attr("class", "link")
			        .attr("d", function(d){return self.LineStyle(self.root.LineStyle)(d) })
			        .style("fill", "none")
                    .style("stroke", "#ccc")
                    .style("stroke-width", "2px")
				    .style("fill-opacity", function(d) {
					    return d.id;
				    });


				link
				.attr("d", self.LineStyle(self.root.LineStyle));

				link.exit().remove();
				// Style the merged selections so new and edited nodes behave alike.
				var allNodes = self.svg.selectAll('g.node');
				allNodes.attr('data-node-id', function (d) { return d.data.identifier; }).attr('role', 'button').attr('tabindex', 0).attr('aria-label', function (d) { return 'Edit ' + d.data.name; }).on('keydown', function (event, d) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNodeClick(d.data.identifier); } });
				allNodes.selectAll('title').remove();
				allNodes.append('title').text(function (d) {
					var own = analysis.nodeIssues.get(d.data) || [];
					return own.join('\n') || (analysis.invalid.has(d.data) ? 'Contains an invalid or incomplete descendant.' : (marks.get(d.data) === 'dominated' ? 'Dominated alternative: another choice has higher EV and a dominant risk profile.' : marks.get(d.data) === 'chosen' ? 'Higher EV and a dominant risk profile.' : 'Click to edit node.'));
				});
				allNodes.select('path').style('stroke', function (d) { return analysis.invalid.has(d.data) || analysis.nodeIssues.has(d.data) ? '#b00020' : null; }).style('stroke-width', 3);
				allNodes.selectAll('text').style('font-weight', function (d) { return analysis.invalid.has(d.data) || analysis.nodeIssues.has(d.data) || marks.get(d.data) === 'chosen' ? 'bold' : 'normal'; });
				allNodes.select('.name').style('fill', function (d) { return analysis.invalid.has(d.data) || analysis.nodeIssues.has(d.data) ? '#b00020' : null; });
				allNodes.selectAll('.analysis-marker').remove();
				allNodes.append('text').attr('class', 'analysis-marker').attr('x', 18).attr('y', -20).style('fill', '#b00020').style('font-weight', 'bold').text(function (d) { return analysis.invalid.has(d.data) || analysis.nodeIssues.has(d.data) ? '⚠' : ''; });
				var allLinks = self.svg.selectAll('path.link');
				allLinks.style('stroke', function (d) { return analysis.invalid.has(d.target.data) || analysis.nodeIssues.has(d.target.data) || analysis.nodeIssues.has(d.source.data) ? '#b00020' : marks.get(d.target.data) === 'chosen' ? '#222' : '#ccc'; })
					.style('stroke-width', function (d) { return analysis.invalid.has(d.target.data) || analysis.nodeIssues.has(d.target.data) || analysis.nodeIssues.has(d.source.data) || marks.get(d.target.data) === 'chosen' ? 4 : 2; });
				self.svg.selectAll('text.branch-rejection').data(links.filter(function (d) { return marks.get(d.target.data) === 'dominated'; })).join('text')
					.attr('class', 'branch-rejection').attr('x', function (d) { return (d.source.y + d.target.y) / 2; }).attr('y', function (d) { return d.target.x + 20; })
					.style('fill', '#b00020').style('font-size', '24px').style('font-weight', 'bold').text('×');
				if (self.onRendered) self.onRendered();
			}
		}

 rtn.SetupD3();
 return { render: function (data, demo) { treeData=data; rtn.demoLayout=demo; rtn.SetupTree(); rtn.RenderTree(); }, element: function () { return container.querySelector('svg'); }, destroy: function () { d3.select(container).selectAll('svg').remove(); } };
}
export function renderRiskProfile(container, profiles) {
            const d3 = window.d3;
            const width = 1024, height = 550;
            const margin = { top: 40, right: 30, bottom: 55, left: 65 };
            const extent = d3.extent(profiles.flatMap(s => s.points.map(p => p.value)));
            const padding = (extent[1] - extent[0]) * .05 || Math.max(1, Math.abs(extent[0]) * .05);
            const domain = [extent[0] - padding, extent[1] + padding];
            const x = d3.scaleLinear().domain(domain).range([margin.left, width - margin.right]);
            const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);
            const colour = d3.scaleOrdinal(d3.schemeTableau10).domain(profiles.map(s => s.id));
            const svg = d3.select(container).append('svg')
                .attr('viewBox', [0, 0, width, height]).attr('width', width)
                .attr('style', 'max-width:100%;height:auto').attr('role', 'img')
                .attr('aria-label', 'Cumulative payoff distributions by strategy');
            svg.append('g').attr('transform', 'translate(0,' + (height - margin.bottom) + ')').call(d3.axisBottom(x));
            svg.append('g').attr('transform', 'translate(' + margin.left + ',0)').call(d3.axisLeft(y).ticks(10));
            svg.append('text').attr('x', margin.left).attr('y', 20).text('Cumulative probability');
            svg.append('text').attr('x', width / 2).attr('y', height - 10).text('Payoff');
            const line = d3.line().x(p => x(p.value)).y(p => y(p.probability)).curve(d3.curveStepAfter);
            profiles.forEach(function (strategy, index) {
                const points = [{ value: domain[0], probability: 0 }].concat(strategy.points, [{ value: domain[1], probability: 1 }]);
                const dash = index < 10 ? null : (2 + Math.floor(index / 10)) + ',3';
                svg.append('path').attr('class', 'strategy-curve').attr('fill', 'none')
                    .attr('stroke', colour(strategy.id)).attr('stroke-width', 2).attr('stroke-dasharray', dash)
                    .attr('d', line(points)).append('title').text(strategy.label + ' — EV ' + strategy.ev);
                const row = d3.select(container.parentNode).select('#risklegend').append('div');
                row.append('svg').attr('width', 35).attr('height', 16).append('line')
                    .attr('x1', 0).attr('x2', 30).attr('y1', 8).attr('y2', 8)
                    .attr('stroke', colour(strategy.id)).attr('stroke-width', 2).attr('stroke-dasharray', dash);
                row.append('span').text(strategy.label + ' — EV ' + strategy.ev.toFixed(2));
            });
          }
