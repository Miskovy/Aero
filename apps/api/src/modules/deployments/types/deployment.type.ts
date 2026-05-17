export type LogPhase =
    | 'clone'
    | 'build'
    | 'push'
    | 'deploy'
    | 'health_check'
    | 'routing'
    | 'failed'
    | 'completed';