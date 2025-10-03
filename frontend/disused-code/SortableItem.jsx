import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/** Clones its single child; no extra wrapper element */
export default function SortableItem({ id, disabled = false, children }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id,
		disabled
	});

	const child = React.Children.only(children);

	const style = {
		...(child.props.style || {}),
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition
	};

	const props = {
		ref: setNodeRef,
		className: child.props.className, // unchanged
		style,
		...(disabled ? {} : { ...attributes, ...listeners })
	};

	return React.cloneElement(child, props);
}
