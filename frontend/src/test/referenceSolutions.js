// Correct reference solutions used to prove each problem's expectedOutput is right.
// The starter code's function body is replaced with these and the test harness lines are kept.

export const JS_SOLUTIONS = {
    "two-sum": `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}`,
    "reverse-string": `function reverseString(s) {
  for (let i = 0, j = s.length - 1; i < j; i++, j--) [s[i], s[j]] = [s[j], s[i]];
}`,
    "valid-palindrome": `function isPalindrome(s) {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return t === [...t].reverse().join("");
}`,
    "maximum-subarray": `function maxSubArray(nums) {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }
  return best;
}`,
    "container-with-most-water": `function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;
  while (l < r) { best = Math.max(best, Math.min(height[l], height[r]) * (r - l)); height[l] < height[r] ? l++ : r--; }
  return best;
}`,
    "valid-parentheses": `function isValid(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" }, st = [];
  for (const c of s) { if (pairs[c]) { if (st.pop() !== pairs[c]) return false; } else st.push(c); }
  return st.length === 0;
}`,
    "best-time-to-buy-and-sell-stock": `function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) { min = Math.min(min, p); best = Math.max(best, p - min); }
  return best;
}`,
    "longest-substring-without-repeating-characters": `function lengthOfLongestSubstring(s) {
  const last = new Map(); let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
    last.set(s[i], i); best = Math.max(best, i - start + 1);
  }
  return best;
}`,
    "merge-intervals": `function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of intervals) {
    if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
    else out.push([s, e]);
  }
  return out;
}`,
    "trapping-rain-water": `function trap(h) {
  let l = 0, r = h.length - 1, lm = 0, rm = 0, w = 0;
  while (l < r) {
    if (h[l] < h[r]) { lm = Math.max(lm, h[l]); w += lm - h[l]; l++; }
    else { rm = Math.max(rm, h[r]); w += rm - h[r]; r--; }
  }
  return w;
}`,
};

export const PY_SOLUTIONS = {
    "two-sum": `def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i`,
    "reverse-string": `def reverseString(s):
    s.reverse()`,
    "valid-palindrome": `def isPalindrome(s):
    t = [c.lower() for c in s if c.isalnum()]
    return t == t[::-1]`,
    "maximum-subarray": `def maxSubArray(nums):
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best`,
    "container-with-most-water": `def maxArea(height):
    l, r, best = 0, len(height) - 1, 0
    while l < r:
        best = max(best, min(height[l], height[r]) * (r - l))
        if height[l] < height[r]:
            l += 1
        else:
            r -= 1
    return best`,
    "valid-parentheses": `def isValid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    st = []
    for c in s:
        if c in pairs:
            if not st or st.pop() != pairs[c]:
                return False
        else:
            st.append(c)
    return not st`,
    "best-time-to-buy-and-sell-stock": `def maxProfit(prices):
    lo, best = float("inf"), 0
    for p in prices:
        lo = min(lo, p)
        best = max(best, p - lo)
    return best`,
    "longest-substring-without-repeating-characters": `def lengthOfLongestSubstring(s):
    last, start, best = {}, 0, 0
    for i, c in enumerate(s):
        if c in last and last[c] >= start:
            start = last[c] + 1
        last[c] = i
        best = max(best, i - start + 1)
    return best`,
    "merge-intervals": `def merge(intervals):
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out`,
    "trapping-rain-water": `def trap(h):
    l, r, lm, rm, w = 0, len(h) - 1, 0, 0, 0
    while l < r:
        if h[l] < h[r]:
            lm = max(lm, h[l]); w += lm - h[l]; l += 1
        else:
            rm = max(rm, h[r]); w += rm - h[r]; r -= 1
    return w`,
};

// Keep only the "test cases" harness from the starter code.
export const harnessOf = (starter, marker) => starter.slice(starter.indexOf(marker));
