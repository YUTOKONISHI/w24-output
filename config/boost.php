<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Boost Master Switch
    |--------------------------------------------------------------------------
    |
    | This option may be used to disable all Boost functionality - which
    | will prevent Boost's routes from being registered and will also
    | disable Boost's browser logging functionality from operating.
    |
    */

    'enabled' => env('BOOST_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Boost Browser Logs Watcher
    |--------------------------------------------------------------------------
    |
    | The following option may be used to enable or disable the browser logs
    | watcher feature within Laravel Boost. The log watcher will read any
    | errors within the browser's console to give Boost better context.
    |
    */

    'browser_logs_watcher' => env('BOOST_BROWSER_LOGS_WATCHER', true),

    /*
    |--------------------------------------------------------------------------
    | Boost Project Rules
    |--------------------------------------------------------------------------
    |
    | Project rules let agents record durable decisions, non-obvious traps, and
    | standing constraints as committed markdown files in .ai/rules/, grouped
    | by file area. Set this to false to remove the record-rule MCP tool.
    |
    */

    'rules' => [
        'enabled' => env('BOOST_RULES_ENABLED', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Boost Executables Paths
    |--------------------------------------------------------------------------
    |
    | These options allow you to specify custom paths for the executables that
    | Boost uses. When configured, they take precedence over the automatic
    | discovery mechanism. Leave empty to use defaults from your $PATH.
    |
    */

    'executable_paths' => [
        'php' => env('BOOST_PHP_EXECUTABLE_PATH'),
        'composer' => env('BOOST_COMPOSER_EXECUTABLE_PATH'),
        'npm' => env('BOOST_NPM_EXECUTABLE_PATH'),
        'vendor_bin' => env('BOOST_VENDOR_BIN_EXECUTABLE_PATH'),
        'current_directory' => env('BOOST_CURRENT_DIRECTORY_EXECUTABLE_PATH'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Browser Log Levels
    |--------------------------------------------------------------------------
    |
    | This option controls which browser console log levels will be captured by
    | Boost's browser logger. You may trim this list down to ['error'] when
    | warnings, info, and debug messages become too noisy to be helpful.
    |
    */

    'browser_log_levels' => explode(',', (string) env('BOOST_BROWSER_LOG_LEVELS', 'error,warning,info,debug')),

    /*
    |--------------------------------------------------------------------------
    | Boost Guidelines Path
    |--------------------------------------------------------------------------
    |
    | Boost writes its guidelines into each agent's own file, which defaults to
    | AGENTS.md (CLAUDE.md for Claude Code). Both hold this project's own rules
    | and are read on every session, so a few hundred lines of generic Laravel
    | guidance would bury them. Every agent is pointed at one shared file that
    | AGENTS.md links to instead.
    |
    */

    'agents' => collect([
        'amp', 'antigravity', 'claude_code', 'codex', 'copilot', 'cursor', 'factory',
        'grok_build', 'junie', 'kiro', 'opencode', 'pi', 'zed',
    ])->mapWithKeys(fn (string $agent): array => [
        $agent => ['guidelines_path' => 'doc/boost-guidelines.md'],
    ])->all(),

];
