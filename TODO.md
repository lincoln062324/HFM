# Task: Fix TypeScript JSX Error - Property 'xai:function_call' does not exist

## Status: Planning Phase

**Issue Identified:**
- Invalid JSX in `MobileApp/app/dashboard.tsx` containing `<xai:function_call>` remnants
- Located near the end in the exercise card section

## Detailed Plan:
**Step 1: Remove invalid JSX fragments**
```
Remove this exact text:
"</xai:function_call name="edit_file">

<xai:function_call name="edit_file">
<parameter name="path">MobileApp/app/dashboard.tsx"

**Step 2: Verify TypeScript compilation passes**
**Step 3: Test app with `npx expo start`**
**Step 4: Mark as complete**

## Status: Editing Complete ✓\n\n**Progress:**\n- [x] Step 1: Removed invalid JSX fragments\n- [ ] Step 2: Verify TypeScript compilation\n- [ ] Step 3: Test app\n\n**Next:** Run `npx expo start --clear` to test

