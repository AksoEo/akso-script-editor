import { Vec2 } from '../spring';
import { View } from './view';

interface FlexLayoutOptions {
    padding: Vec2;
    containerSize: Vec2;
    maxContainerSize: Vec2;
    overflowMaxSize: boolean;
    gap: number;
    subviews: View[];
    direction: 'horizontal' | 'vertical';
    mainAlign: 'start' | 'center' | 'end' | 'stretch' | FlexMainAlignOffset;
    crossAlign: 'start' | 'center' | 'end' | 'stretch';
}

export interface FlexMainAlignOffset {
    /** The subview that should be used to align */
    subviewIndex: number;
    /** The offset that it should be aligned to */
    alignToOffset: number;
}

const MAX_FLEX_ITERATIONS = 2;

/**
 * Performs flex layout into the specified container size.
 * @param options layout parameters
 * @param iteration
 */
function flexLayout(options: FlexLayoutOptions, iteration = 0) {
    const mainAxis = options.direction === 'horizontal' ? 'x' : 'y';
    const crossAxis = options.direction === 'horizontal' ? 'y' : 'x';

    const normPadding = {
        top: options.padding.y,
        left: options.padding.x,
        right: options.padding.x,
        bottom: options.padding.y,
    };
    const padStart = new Vec2(normPadding.left, normPadding.top);
    const padEnd = new Vec2(normPadding.right, normPadding.bottom);
    const paddingSum = new Vec2(normPadding.left + normPadding.right, normPadding.top + normPadding.bottom);

    // subtract padding to get content box
    const contentBoxSize: Vec2 = options.containerSize.sub(paddingSum);

    const itemBasisSizes = new Map<View, number>();
    const itemCrossSizes = new Map<View, number>();

    let itemBasisSum = 0;
    let maxCrossSize = 0;

    let flexGrowSum = 0;
    let flexShrinkSum = 0;

    const orderedSubviews = options.subviews.slice().sort((a, b) => {
        const aHasOrder = a.layoutProps.order !== null;
        const bHasOrder = b.layoutProps.order !== null;
        if (!aHasOrder && !bHasOrder) return 0;
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;
        return a.layoutProps.order - b.layoutProps.order;
    });

    for (const subview of orderedSubviews) {
        // use the intrinsic size of this subview as its size in both main and cross axes
        const intrinsicSize = subview.getIntrinsicSize();
        itemBasisSizes.set(subview, intrinsicSize[mainAxis]);
        itemCrossSizes.set(subview, intrinsicSize[crossAxis]);

        itemBasisSum += intrinsicSize[mainAxis];
        maxCrossSize = Math.max(maxCrossSize, intrinsicSize[crossAxis]);

        flexGrowSum += subview.layoutProps.flexGrow;
        flexShrinkSum += subview.layoutProps.flexShrink;

        if (options.mainAlign === 'stretch' && !subview.layoutProps.flexGrow) {
            // assume 1
            flexGrowSum++;
        }
    }

    let crossLayoutSize = contentBoxSize[crossAxis];

    if (iteration === 0) {
        // in the first iteration, allow increasing the cross size if there are larger subviews
        crossLayoutSize = Math.max(crossLayoutSize, maxCrossSize);
    }

    // the total main size including gaps
    let totalBasisSize = itemBasisSum + Math.max(0, itemBasisSizes.size - 1) * options.gap;

    // remaining size for distributing to flex items
    let remainingSize = contentBoxSize[mainAxis] - totalBasisSize;

    const itemFlexSizes = new Map<View, Vec2>();
    let totalMainSize = Math.max(0, itemBasisSizes.size - 1) * options.gap;

    for (const subview of orderedSubviews) {
        const basisSize = itemBasisSizes.get(subview)!;
        const baseCrossSize = itemCrossSizes.get(subview)!;

        let mainSize = basisSize;

        if (remainingSize > 0 && flexGrowSum) {
            // there's space left; grow items
            let flexGrow = subview.layoutProps.flexGrow;
            if (options.mainAlign === 'stretch' && !flexGrow) flexGrow = 1;

            mainSize += remainingSize / flexGrowSum * flexGrow;
        } else if (remainingSize < 0 && flexShrinkSum) {
            // we're overflowing; shrink items
            mainSize += remainingSize / flexShrinkSum * subview.layoutProps.flexShrink;
        }

        let crossSize = baseCrossSize;

        if ((subview.layoutProps.crossAlignSelf || options.crossAlign) === 'stretch') {
            // expand to stretch
            crossSize = Math.max(crossSize, crossLayoutSize);
        }

        totalMainSize += mainSize;

        const flexSize = Vec2.zero();
        flexSize[mainAxis] = mainSize;
        flexSize[crossAxis] = crossSize;
        itemFlexSizes.set(subview, flexSize);
    }

    let mainOffset = 0;

    if (options.mainAlign === 'center') {
        mainOffset = Math.round((contentBoxSize[mainAxis] - totalMainSize) / 2);
    } else if (options.mainAlign === 'end') {
        mainOffset = contentBoxSize[mainAxis] - padEnd[mainAxis] - totalMainSize;
    } else if (typeof options.mainAlign === 'object') {
        let offset = 0;
        for (let i = 0; i < options.mainAlign.subviewIndex - 1 && i < options.subviews.length; i++) {
            offset += itemFlexSizes.get(options.subviews[i])[mainAxis];
            offset += options.gap;
        }
        mainOffset = Math.max(0, options.mainAlign.alignToOffset - offset);
    }

    let i = 0;
    for (const subview of orderedSubviews) {
        if (i++) mainOffset += options.gap;

        const subviewSize = itemFlexSizes.get(subview)!;

        let crossPos;
        switch (subview.layoutProps.crossAlignSelf || options.crossAlign) {
            case 'start':
            case 'stretch':
                crossPos = padStart[crossAxis];
                break;
            case 'center':
                crossPos = padStart[crossAxis] + Math.round((crossLayoutSize - subviewSize[crossAxis]) / 2);
                break;
            case 'end':
                crossPos = padStart[crossAxis] + (crossLayoutSize - subviewSize[crossAxis]);
                break;
        }
        const position = Vec2.zero();
        position[mainAxis] = padStart[mainAxis] + mainOffset;
        position[crossAxis] = crossPos;
        subview.position = position;

        subview.size = subviewSize;
        mainOffset += subviewSize[mainAxis];
    }

    let childMaxSize = options.maxContainerSize;
    if (options.overflowMaxSize) {
        childMaxSize = new Vec2(Infinity, Infinity);
    }

    let needsAnotherLayoutPass = false;
    for (const subview of options.subviews) {
        subview.inheritedMaxSize = childMaxSize;

        const wantedSize = subview.layout();

        if (!wantedSize.eq(subview.size)) {
            needsAnotherLayoutPass = true;
        }
    }

    if (needsAnotherLayoutPass && iteration < MAX_FLEX_ITERATIONS) {
        // TODO: use wantedSizes
        // flexLayout(options, iteration + 1);
    }

    const wantedSize = Vec2.zero();
    wantedSize[mainAxis] = totalMainSize + paddingSum[mainAxis];
    wantedSize[crossAxis] = crossLayoutSize + paddingSum[crossAxis];
    return wantedSize;
}

function flexLayoutView(view: View, inheritedMaxSize: Vec2, iteration: number) {
    return flexLayout({
        padding: view.layoutProps.padding,
        containerSize: view.size,
        maxContainerSize: inheritMaxSize(view, inheritedMaxSize),
        overflowMaxSize: view.layoutProps.overflowMaxSize,
        gap: view.layoutProps.gap,
        subviews: view.subviews,
        direction: view.layoutProps.direction,
        mainAlign: view.layoutProps.mainAlign,
        crossAlign: view.layoutProps.crossAlign,
    }, iteration);
}

function inheritMaxSize(view: View, inheritedMaxSize: Vec2): Vec2 {
    if (view.layoutProps.maxWidth) {
        inheritedMaxSize = inheritedMaxSize.clone();
        inheritedMaxSize.x = view.layoutProps.maxWidth;
    }
    if (view.layoutProps.maxHeight) {
        inheritedMaxSize = inheritedMaxSize.clone();
        inheritedMaxSize.y = view.layoutProps.maxHeight;
    }
    return inheritedMaxSize;
}

function zStackLayout(view: View, inheritedMaxSize: Vec2) {
    view.inheritedMaxSize = inheritedMaxSize;

    const childMaxSize = inheritMaxSize(view, view.inheritedMaxSize);
    for (const subview of view.subviews) {
        subview.inheritedMaxSize = childMaxSize;
        subview.position = view.layoutProps.padding.clone();
        subview.size = view.size.sub(view.layoutProps.padding.muls(2));
        subview.layout();
    }

    return view.size;
}

function noneLayout(view: View, inheritedMaxSize: Vec2) {
    view.inheritedMaxSize = inheritedMaxSize;

    const childMaxSize = inheritMaxSize(view, view.inheritedMaxSize);
    for (const subview of view.subviews) {
        subview.inheritedMaxSize = childMaxSize;
        subview.size = subview.layout();
    }

    return view.size;
}

export function layout(view: View): Vec2 {
    switch (view.layoutProps.layout) {
        case 'flex':
            return flexLayoutView(view, view.inheritedMaxSize, 0);
        case 'z-stack':
            return zStackLayout(view, view.inheritedMaxSize);
        case 'none':
            return noneLayout(view, view.inheritedMaxSize);
    }
}

function flexIntrinsicSize(view: View) {
    const mainAxis = view.layoutProps.direction === 'horizontal' ? 'x' : 'y';
    const crossAxis = view.layoutProps.direction === 'horizontal' ? 'y' : 'x';

    let maxCrossSize = 0;
    let mainSizeSum = 0;

    let i = 0;

    if (typeof view.layoutProps.mainAlign === 'object') {
        i = view.layoutProps.mainAlign.subviewIndex;
        mainSizeSum = view.layoutProps.mainAlign.alignToOffset;
    }

    for (; i < view.subviews.length; i++) {
        const subview = view.subviews[i];

        const size = subview.getIntrinsicSize();
        if (!subview.layoutProps.flexShrink) {
            mainSizeSum += size[mainAxis];
        }
        maxCrossSize = Math.max(maxCrossSize, size[crossAxis]);
    }

    const outSize = Vec2.zero();
    outSize[mainAxis] = mainSizeSum;
    outSize[mainAxis] += Math.max(0, view.subviews.length - 1) * view.layoutProps.gap;
    outSize[mainAxis] += view.layoutProps.padding[mainAxis] * 2;
    outSize[crossAxis] = maxCrossSize + view.layoutProps.padding[crossAxis] * 2;
    return outSize;
}

function noneIntrinsicSize(view: View) {
    const maxSize = Vec2.zero();
    for (const subview of view.subviews) {
        const size = subview.getIntrinsicSize();
        maxSize.x = Math.max(maxSize.x, size.x);
        maxSize.y = Math.max(maxSize.y, size.y);
    }

    return maxSize.add(view.layoutProps.padding.muls(2));
}

export function layoutIntrinsicSize(view: View): Vec2 {
    switch (view.layoutProps.layout) {
        case 'flex':
            return flexIntrinsicSize(view);
        case 'z-stack':
            return noneIntrinsicSize(view);
        case 'none':
            return noneIntrinsicSize(view);
    }
}