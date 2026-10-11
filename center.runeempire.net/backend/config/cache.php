<?php

/*
 * Only the overrides; Laravel merges the rest from its own config/cache.php.
 */
return [

    /*
     * Never unserialize objects from the cache, so a tampered cache entry
     * cannot instantiate arbitrary classes.
     */
    'serializable_classes' => false,

];
