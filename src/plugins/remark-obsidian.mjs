import { visit } from 'unist-util-visit';

const slugify = (text) =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-');

export function remarkObsidian() {
	return (tree) => {
		visit(tree, 'text', (node, index, parent) => {
			const regex = /\[\[(.*?)\]\]/g;
			
			if (regex.test(node.value)) {
				const newNodes = [];
				let lastIndex = 0;
				let match;
				
				// Reset regex index for the loop
				regex.lastIndex = 0;
				
				while ((match = regex.exec(node.value)) !== null) {
					// Add text before the match
					if (match.index > lastIndex) {
						newNodes.push({
							type: 'text',
							value: node.value.slice(lastIndex, match.index),
						});
					}

					let content = match[1];
					let displayName = content;
					let url = '';

					// Handle [[Link|Display]]
					if (content.includes('|')) {
						const [linkPart, displayPart] = content.split('|');
						content = linkPart;
						displayName = displayPart;
					}

					// Handle [[#Heading]]
					if (content.startsWith('#')) {
						url = '#' + slugify(content.slice(1));
						if (displayName.startsWith('#')) {
							displayName = displayName.slice(1);
						}
					} else {
						// Handle [[Page Name]] or [[Page Name#Heading]]
						const [page, heading] = content.split('#');
						url = `/blog/${slugify(page)}${heading ? '#' + slugify(heading) : ''}`;
					}

					newNodes.push({
						type: 'link',
						url: url,
						children: [{ type: 'text', value: displayName }],
					});

					lastIndex = regex.lastIndex;
				}

				// Add remaining text after last match
				if (lastIndex < node.value.length) {
					newNodes.push({
						type: 'text',
						value: node.value.slice(lastIndex),
					});
				}

				// Replace the original text node with the new set of nodes
				parent.children.splice(index, 1, ...newNodes);
				
				// Return the next index to skip the nodes we just added
				return index + newNodes.length;
			}
		});
	};
}


//1. Created a custom Remark plugin in src/plugins/remark-obsidian.mjs. This plugin runs during the build process and transforms any [[...]] syntax into
//standard HTML links.
//2. Registered the plugin in your astro.config.mjs.
//3. Matched your slugification logic: The plugin uses the exact same slugify function found in your BlogPost.astro layout. This ensures that a link like
//[[#Security Posture]] correctly generates a link to #security-posture, matching the ID created by your Table of Contents script.

//How it works:
//- Internal Links: [[#Security Posture]] becomes a link to the #security-posture section of the same post.
//- Page Links: [[Designing a Reverse Proxy Gateway]] will automatically link to /blog/designing-a-reverse-proxy-gateway.
//- Piped Links: [[#Security Posture|Check the security]] will show the text "Check the security" but link to the section.
