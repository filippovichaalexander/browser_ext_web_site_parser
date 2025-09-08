/**
 * Keyword Grouping Utilities
 * Language-agnostic N-gram based keyword clustering
 */

// Language-agnostic intent patterns using Unicode categories and common patterns
const INTENT_PATTERNS = {
  informational: {
    // Common question markers across languages (how, what, why, когда, 什么, كيف, etc.)
    patterns: [
      /^(how|what|why|when|where|who|which|comment|qué|cómo|когда|что|как|什么|怎么|どう|何|왜|무엇)/i,
      /(guide|tutorial|tips|learn|understand|учить|学习|تعلم|guía|ガイド)/i,
      /\?$/ // Questions often end with ?
    ],
    weight: 0.8
  },
  commercial: {
    // Shopping and comparison terms across languages
    patterns: [
      /(buy|purchase|price|cost|cheap|best|review|vs|compare|купить|покупка|цена|购买|价格|شراء|سعر|comprar|precio|比較|購入)/i,
      /(discount|deal|sale|offer|скидка|折扣|تخفيض|descuento|割引)/i,
      /[0-9]+[.,]?[0-9]*\s*(€|$|£|¥|₽|₹|₩|﷼)/ // Price patterns
    ],
    weight: 0.9
  },
  navigational: {
    // Website navigation terms
    patterns: [
      /(login|signin|website|homepage|contact|about|вход|登录|دخول|サインイン)/i,
      /^(www\.|https?:\/\/)/, // URLs
      /(\.com|\.org|\.net|\.edu)/i // Domain extensions
    ],
    weight: 0.7
  },
  transactional: {
    // Action-oriented terms
    patterns: [
      /(download|install|signup|register|subscribe|order|скачать|下载|تحميل|ダウンロード|descargar)/i,
      /(free|trial|demo|бесплатно|免费|مجاني|無料|gratis)/i
    ],
    weight: 0.85
  }
};

/**
 * Generate character n-grams from a string (language-agnostic)
 * N-grams work across all languages as they look at character sequences
 */
function getNGrams(str, n = 2) {
  const cleanStr = str.toLowerCase().replace(/\s+/g, ' ').trim();
  const ngrams = new Set();
  
  // Add word boundaries for better matching
  const paddedStr = `#${cleanStr}#`;
  
  for (let i = 0; i <= paddedStr.length - n; i++) {
    ngrams.add(paddedStr.substr(i, n));
  }
  
  return ngrams;
}

/**
 * Generate word-level tokens (works for any language)
 * Splits on whitespace and common punctuation
 */
function getWordTokens(keyword) {
  // Split on whitespace and common punctuation, but preserve meaningful characters
  return keyword
    .toLowerCase()
    .split(/[\s\-_,;:.!?()[\]{}'"]+/)
    .filter(token => token.length > 0);
}

/**
 * Extract meaningful terms using multiple strategies
 * Works across languages by not relying on specific stop words
 */
function extractTerms(keyword) {
  const tokens = getWordTokens(keyword);
  
  // Filter out very short tokens (likely stop words in any language)
  // But keep single character tokens for CJK languages
  const isCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(keyword);
  const minLength = isCJK ? 1 : 2;
  
  return tokens.filter(token => {
    // Keep if meets minimum length
    if (token.length < minLength) return false;
    
    // Keep if contains letters from any script
    if (/\p{L}/u.test(token)) return true;
    
    // Keep if contains numbers mixed with letters
    if (/\d/.test(token) && /\p{L}/u.test(token)) return true;
    
    return false;
  });
}

/**
 * Calculate Jaccard similarity between two sets of terms
 */
function jaccardSimilarity(terms1, terms2) {
  const set1 = new Set(terms1);
  const set2 = new Set(terms2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Calculate Levenshtein distance between two strings (works for any language)
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate normalized edit distance similarity
 */
function editDistanceSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Calculate similarity using optimized algorithmic approach
 */
function calculateSimilarity(keyword1, keyword2) {
  return calculateAlgorithmicSimilarity(keyword1, keyword2);
}

/**
 * Calculate algorithmic similarity using multiple measures (language-agnostic)
 */
function calculateAlgorithmicSimilarity(keyword1, keyword2) {
  // Quick exact match check
  if (keyword1.toLowerCase() === keyword2.toLowerCase()) return 1.0;
  
  // 1. Character-level n-gram similarity (works for all languages)
  const ngrams1 = getNGrams(keyword1, 2);
  const ngrams2 = getNGrams(keyword2, 2);
  const ngramSimilarity = jaccardSimilarity(Array.from(ngrams1), Array.from(ngrams2));
  
  // 2. Trigram similarity for better accuracy
  const trigrams1 = getNGrams(keyword1, 3);
  const trigrams2 = getNGrams(keyword2, 3);
  const trigramSimilarity = jaccardSimilarity(Array.from(trigrams1), Array.from(trigrams2));
  
  // 3. Word-level token similarity
  const tokens1 = getWordTokens(keyword1);
  const tokens2 = getWordTokens(keyword2);
  const tokenSimilarity = tokens1.length > 0 && tokens2.length > 0 
    ? jaccardSimilarity(tokens1, tokens2)
    : 0;
  
  // 4. Edit distance similarity (good for typos and variations)
  const editSimilarity = editDistanceSimilarity(keyword1, keyword2);
  
  // 5. Prefix/suffix matching (common in many languages)
  let affixBonus = 0;
  const k1Lower = keyword1.toLowerCase();
  const k2Lower = keyword2.toLowerCase();
  
  // Check if one starts with the other (prefix matching)
  if (k1Lower.startsWith(k2Lower) || k2Lower.startsWith(k1Lower)) {
    affixBonus += 0.15;
  }
  
  // Check if one ends with the other (suffix matching)
  if (k1Lower.endsWith(k2Lower) || k2Lower.endsWith(k1Lower)) {
    affixBonus += 0.1;
  }
  
  // 6. Common substring bonus (for compound words in any language)
  const longestCommonSubstring = findLongestCommonSubstring(k1Lower, k2Lower);
  const substringBonus = longestCommonSubstring.length >= 4 
    ? (longestCommonSubstring.length / Math.max(k1Lower.length, k2Lower.length)) * 0.2
    : 0;
  
  // Weighted combination of all similarity measures
  const weights = {
    ngram: 0.25,      // Character bigrams
    trigram: 0.20,    // Character trigrams
    token: 0.20,      // Word tokens
    edit: 0.25,       // Edit distance
    affix: 0.05,      // Prefix/suffix
    substring: 0.05   // Common substrings
  };
  
  const weightedSimilarity = 
    ngramSimilarity * weights.ngram +
    trigramSimilarity * weights.trigram +
    tokenSimilarity * weights.token +
    editSimilarity * weights.edit +
    affixBonus * weights.affix +
    substringBonus * weights.substring;
  
  return Math.min(weightedSimilarity, 1.0);
}

/**
 * Find longest common substring (works for any character set)
 */
function findLongestCommonSubstring(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  let maxLength = 0;
  let endingPos = 0;
  
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLength) {
          maxLength = dp[i][j];
          endingPos = i;
        }
      }
    }
  }
  
  return str1.substring(endingPos - maxLength, endingPos);
}

/**
 * Classify keyword intent based on patterns
 */
function classifyIntent(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  let bestIntent = 'informational';
  let bestScore = 0;
  
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lowerKeyword)) {
        if (config.weight > bestScore) {
          bestScore = config.weight;
          bestIntent = intent;
        }
        break;
      }
    }
  }
  
  return bestIntent;
}

/**
 * Extract the main topic/theme from a group of keywords (language-agnostic)
 */
function extractGroupTopic(keywords) {
  // Strategy 1: Find the shortest common meaningful substring
  const commonSubstrings = findCommonSubstrings(keywords);
  if (commonSubstrings.length > 0) {
    return commonSubstrings[0];
  }
  
  // Strategy 2: Find most frequent tokens across keywords
  const tokenFreq = new Map();
  const ngramFreq = new Map();
  
  keywords.forEach(keyword => {
    // Count word tokens
    const tokens = getWordTokens(keyword);
    tokens.forEach(token => {
      if (token.length > 1) {  // Skip very short tokens
        tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
      }
    });
    
    // Count character trigrams for languages without clear word boundaries
    const trigrams = Array.from(getNGrams(keyword, 3));
    trigrams.forEach(gram => {
      ngramFreq.set(gram, (ngramFreq.get(gram) || 0) + 1);
    });
  });
  
  // Find tokens that appear in multiple keywords
  const commonTokens = Array.from(tokenFreq.entries())
    .filter(([token, freq]) => freq > Math.min(2, keywords.length * 0.3))
    .sort((a, b) => {
      // Sort by frequency, then by length (prefer longer terms)
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    })
    .slice(0, 3)
    .map(([token]) => token);
  
  if (commonTokens.length > 0) {
    // For CJK languages, join without space
    const firstKeyword = keywords[0] || '';
    const isCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(firstKeyword);
    return commonTokens.join(isCJK ? '' : ' + ');
  }
  
  // Strategy 3: Use the shortest keyword as representative
  const shortestKeyword = keywords.reduce((shortest, keyword) => 
    keyword.length < shortest.length ? keyword : shortest
  , keywords[0]);
  
  // Truncate if too long
  return shortestKeyword.length > 30 
    ? shortestKeyword.substring(0, 27) + '...'
    : shortestKeyword;
}

/**
 * Find common substrings across keywords (language-agnostic)
 */
function findCommonSubstrings(keywords) {
  if (keywords.length < 2) return [];
  
  const commonSubstrings = [];
  const firstKeyword = keywords[0].toLowerCase();
  
  // Try different substring lengths
  for (let len = Math.min(firstKeyword.length, 20); len >= 3; len--) {
    for (let start = 0; start <= firstKeyword.length - len; start++) {
      const substring = firstKeyword.substring(start, start + len);
      
      // Check if this substring appears in all keywords
      const appearsInAll = keywords.every(keyword => 
        keyword.toLowerCase().includes(substring)
      );
      
      if (appearsInAll) {
        // Skip if it's mostly numbers or special characters
        if (!/^[\d\s\-_.]+$/.test(substring)) {
          commonSubstrings.push(substring);
        }
      }
    }
    
    // If we found common substrings at this length, stop looking for shorter ones
    if (commonSubstrings.length > 0) {
      break;
    }
  }
  
  // Return the most meaningful common substring
  return commonSubstrings
    .filter(s => s.trim().length > 2)
    .sort((a, b) => {
      // Prefer substrings that are complete words
      const aIsWord = keywords.some(k => new RegExp(`\\b${a}\\b`, 'i').test(k));
      const bIsWord = keywords.some(k => new RegExp(`\\b${b}\\b`, 'i').test(k));
      
      if (aIsWord && !bIsWord) return -1;
      if (!aIsWord && bIsWord) return 1;
      
      // Otherwise prefer longer substrings
      return b.length - a.length;
    });
}

/**
 * Group keywords using hierarchical clustering with N-gram analysis
 */
function groupKeywords(keywordData, options = {}) {
  const {
    similarityThreshold = 0.5,
    minGroupSize = 2,
    maxGroups = 20,
    groupByIntent = true
  } = options;
  
  if (!keywordData || keywordData.length === 0) {
    return { groups: [], ungrouped: [] };
  }
  
  // First, classify keywords by intent if enabled
  const keywordsByIntent = groupByIntent ? groupBySearchIntent(keywordData) : { all: keywordData };
  const finalGroups = [];
  let ungrouped = [];
  
  // Process each intent group
  for (const [intent, intentKeywords] of Object.entries(keywordsByIntent)) {
    if (intentKeywords.length < 2) {
      ungrouped.push(...intentKeywords);
      continue;
    }
    
    // Create similarity matrix using algorithmic similarity
    const similarities = createSimilarityMatrix(intentKeywords);
    
    // Hierarchical clustering
    const clusters = performHierarchicalClustering(
      intentKeywords,
      similarities,
      similarityThreshold
    );
    
    // Process clusters into groups
    clusters.forEach(cluster => {
      if (cluster.length >= minGroupSize) {
        const groupTopic = extractGroupTopic(cluster.map(item => item.query));
        const groupMetrics = calculateGroupMetrics(cluster);
        
        finalGroups.push({
          id: `group_${finalGroups.length + 1}`,
          topic: groupTopic,
          intent: groupByIntent ? intent : classifyIntent(cluster[0].query),
          keywords: cluster,
          metrics: groupMetrics,
          size: cluster.length,
          expanded: false // For UI state
        });
      } else {
        ungrouped.push(...cluster);
      }
    });
  }
  
  // Sort groups by total clicks (descending)
  finalGroups.sort((a, b) => b.metrics.totalClicks - a.metrics.totalClicks);
  
  // Limit number of groups
  if (finalGroups.length > maxGroups) {
    const extraGroups = finalGroups.splice(maxGroups);
    ungrouped.push(...extraGroups.flatMap(group => group.keywords));
  }
  
  return {
    groups: finalGroups,
    ungrouped: ungrouped,
    totalGroups: finalGroups.length,
    totalKeywords: keywordData.length,
    groupedKeywords: finalGroups.reduce((sum, group) => sum + group.size, 0)
  };
}

/**
 * Create similarity matrix using n-gram analysis
 */
function createSimilarityMatrix(keywords) {
  const length = keywords.length;
  const similarities = Array(length).fill(null).map(() => Array(length).fill(0));
  
  // Calculate similarities for upper triangle (matrix is symmetric)
  for (let i = 0; i < length; i++) {
    similarities[i][i] = 1.0; // Diagonal elements
    
    for (let j = i + 1; j < length; j++) {
      const similarity = calculateSimilarity(
        keywords[i].query,
        keywords[j].query
      );
      
      // Fill both upper and lower triangles (symmetric matrix)
      similarities[i][j] = similarity;
      similarities[j][i] = similarity;
    }
  }
  
  return similarities;
}

/**
 * Group keywords by search intent first
 */
function groupBySearchIntent(keywordData) {
  const intentGroups = {
    informational: [],
    commercial: [],
    navigational: [],
    transactional: []
  };
  
  keywordData.forEach(keyword => {
    const intent = classifyIntent(keyword.query);
    intentGroups[intent].push(keyword);
  });
  
  return intentGroups;
}

/**
 * Perform hierarchical clustering using single linkage
 */
function performHierarchicalClustering(items, similarities, threshold) {
  // Initialize each item as its own cluster
  let clusters = items.map(item => [item]);
  
  while (true) {
    let maxSimilarity = -1;
    let mergeIndices = [-1, -1];
    
    // Find the two most similar clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const similarity = getClusterSimilarity(clusters[i], clusters[j], similarities, items);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mergeIndices = [i, j];
        }
      }
    }
    
    // Stop if no similarity above threshold
    if (maxSimilarity < threshold) {
      break;
    }
    
    // Merge the two most similar clusters
    const [i, j] = mergeIndices;
    const mergedCluster = [...clusters[i], ...clusters[j]];
    clusters = clusters.filter((_, index) => index !== i && index !== j);
    clusters.push(mergedCluster);
  }
  
  return clusters;
}

/**
 * Calculate similarity between two clusters (single linkage)
 */
function getClusterSimilarity(cluster1, cluster2, similarities, allItems) {
  let maxSimilarity = 0;
  
  for (const item1 of cluster1) {
    for (const item2 of cluster2) {
      const index1 = allItems.indexOf(item1);
      const index2 = allItems.indexOf(item2);
      const similarity = similarities[index1][index2];
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  return maxSimilarity;
}

/**
 * Calculate aggregated metrics for a group of keywords
 */
function calculateGroupMetrics(keywords) {
  const totalClicks = keywords.reduce((sum, kw) => sum + (kw.clicks || 0), 0);
  const totalImpressions = keywords.reduce((sum, kw) => sum + (kw.impressions || 0), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgPosition = keywords.reduce((sum, kw) => sum + (kw.position || 0), 0) / keywords.length;
  
  return {
    totalClicks,
    totalImpressions,
    avgCTR: Math.round(avgCTR * 100) / 100,
    avgPosition: Math.round(avgPosition * 10) / 10,
    keywordCount: keywords.length
  };
}

/**
 * Filter groups based on criteria
 */
function filterGroups(groups, criteria) {
  return groups.filter(group => {
    if (criteria.intent && group.intent !== criteria.intent) return false;
    if (criteria.minClicks && group.metrics.totalClicks < criteria.minClicks) return false;
    if (criteria.minSize && group.size < criteria.minSize) return false;
    if (criteria.searchTerm) {
      const searchLower = criteria.searchTerm.toLowerCase();
      return group.topic.toLowerCase().includes(searchLower) ||
             group.keywords.some(kw => kw.query.toLowerCase().includes(searchLower));
    }
    return true;
  });
}

/**
 * Export grouped data for external use
 */
function exportGroupedData(groupingResult, format = 'csv') {
  const data = [];
  
  groupingResult.groups.forEach(group => {
    group.keywords.forEach(keyword => {
      data.push({
        keyword: keyword.query,
        group_topic: group.topic,
        group_intent: group.intent,
        group_size: group.size,
        clicks: keyword.clicks || 0,
        impressions: keyword.impressions || 0,
        ctr: keyword.ctr || 0,
        position: keyword.position || 0,
        group_total_clicks: group.metrics.totalClicks,
        group_avg_position: group.metrics.avgPosition
      });
    });
  });
  
  // Add ungrouped keywords
  groupingResult.ungrouped.forEach(keyword => {
    data.push({
      keyword: keyword.query,
      group_topic: 'Ungrouped',
      group_intent: classifyIntent(keyword.query),
      group_size: 1,
      clicks: keyword.clicks || 0,
      impressions: keyword.impressions || 0,
      ctr: keyword.ctr || 0,
      position: keyword.position || 0,
      group_total_clicks: keyword.clicks || 0,
      group_avg_position: keyword.position || 0
    });
  });
  
  return data;
}

// Export functions
export {
  groupKeywords,
  filterGroups,
  calculateGroupMetrics,
  classifyIntent,
  exportGroupedData,
  extractTerms,
  extractGroupTopic,
  calculateAlgorithmicSimilarity,
  createSimilarityMatrix
};